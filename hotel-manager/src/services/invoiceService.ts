import { db, type Tx } from "@/prisma/db";
import { or } from "@prisma/orm-postgres/orm-client";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/apiResponse";
import { calculateInvoice } from "@/lib/calculateInvoice";
import { calendarDays } from "@/lib/dates";
import { assertRole, likePattern } from "@/lib/serviceHelpers";
import type { Session } from "@/services/authService";
import type {
    AddInvoiceItemInput,
    CheckOutInput,
    ListInvoicesFilters,
    RefundInput,
    SetDiscountInput,
    UpdateInvoiceItemInput,
} from "@/schemas/invoice";

async function loadDraft(tx: Tx, invoiceId: string) {
    const invoice = await tx.orm.public.Invoice.where({ id: invoiceId }).first();
    if (!invoice) throw new NotFoundError("Invoice not found");
    if (invoice.status !== "DRAFT") throw new ConflictError("Only a draft invoice can be changed");
    return invoice;
}

// recomputes and stores the invoice's totals from its room charge, lines, discount, and tax rate
async function recalculate(tx: Tx, invoiceId: string) {
    const invoice = await tx.orm.public.Invoice.where({ id: invoiceId }).include("items").first();
    if (!invoice) throw new NotFoundError("Invoice not found");

    const calc = calculateInvoice({
        roomCharge: invoice.roomCharge,
        items: [...invoice.items],
        discount: invoice.discount,
        taxRate: invoice.taxRate,
    });
    await tx.orm.public.Invoice.where({ id: invoiceId }).update({
        subtotal: calc.subtotal,
        taxAmount: calc.taxAmount,
        discount: calc.appliedDiscount,
        total: calc.total,
    });
    return calc;
}

export async function listInvoices(filters: ListInvoicesFilters, session: Session) {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST");
    const { search, status, startDate, endDate, page, limit } = filters;

    let query = db.orm.public.Invoice.where({});
    if (status) query = query.where({ status });
    if (startDate) query = query.where((i) => i.paidAt.gte(new Date(`${startDate}T00:00:00.000Z`)));
    if (endDate) query = query.where((i) => i.paidAt.lte(new Date(`${endDate}T23:59:59.999Z`)));

    if (search) {
        const pattern = likePattern(search);
        const guests = await db.orm.public.Guest.where((g) => g.fullName.ilike(pattern)).select("id").all();
        const guestIds = guests.map((g) => g.id);
        const reservations =
            guestIds.length > 0
                ? await db.orm.public.Reservation.where((r) => r.guestId.in(guestIds)).select("id").all()
                : [];
        const reservationIds = reservations.map((r) => r.id);
        query = query.where((i) =>
            reservationIds.length > 0 ? or(i.id.ilike(pattern), i.reservationId.in(reservationIds)) : i.id.ilike(pattern)
        );
    }

    const { total } = await query.aggregate((a) => ({ total: a.count() }));
    const rows = await query
        .orderBy([(i) => i.paidAt.desc(), (i) => i.id.desc()])
        .include("reservation", (r) => r.include("guest").include("room"))
        .limit(limit)
        .offset((page - 1) * limit)
        .all();

    const items = rows.map((i) => ({
        id: i.id,
        reservationId: i.reservationId,
        guestName: i.reservation.guest.fullName,
        roomNumber: i.reservation.room?.roomNumber ?? null,
        status: i.status,
        total: i.total,
        paymentMethod: i.paymentMethod,
        paidAt: i.paidAt,
        refundedAt: i.refundedAt,
        refundAmount: i.refundAmount,
    }));
    return { items, total, page, limit };
}

export async function getInvoice(invoiceId: string, session: Session) {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST");

    const invoice = await db.orm.public.Invoice
        .where({ id: invoiceId })
        .include("items")
        .include("paidBy")
        .include("reservation", (r) => r.include("guest").include("room"))
        .first();
    if (!invoice) throw new NotFoundError("Invoice not found");

    const { reservation } = invoice;
    return {
        id: invoice.id,
        status: invoice.status,
        reservation: {
            id: reservation.id,
            status: reservation.status,
            checkInDate: reservation.checkInDate,
            checkOutDate: reservation.checkOutDate,
            nights: Math.max(1, calendarDays(reservation.checkInDate, reservation.checkOutDate)),
            guestId: reservation.guestId,
            guestName: reservation.guest.fullName,
            roomNumber: reservation.room?.roomNumber ?? null,
        },
        roomCharge: invoice.roomCharge,
        items: invoice.items
            .map((i) => ({
                id: i.id,
                serviceItemId: i.serviceItemId,
                name: i.name,
                unitPrice: i.unitPrice,
                quantity: i.quantity,
                total: i.unitPrice * i.quantity,
            }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        subtotal: invoice.subtotal,
        discount: invoice.discount,
        taxRate: invoice.taxRate,
        taxAmount: invoice.taxAmount,
        total: invoice.total,
        paymentMethod: invoice.paymentMethod,
        paidAt: invoice.paidAt,
        paidByName: invoice.paidBy?.fullName ?? null,
        refundedAt: invoice.refundedAt,
        refundAmount: invoice.refundAmount,
        issuedAt: invoice.issuedAt,
    };
}

// adding a service that is already on the invoice raises that line's quantity, keeping the price it was first billed at
export async function addInvoiceItem(invoiceId: string, input: AddInvoiceItemInput, session: Session) {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST");

    return db.transaction(async (tx) => {
        await loadDraft(tx, invoiceId);

        const service = await tx.orm.public.ServiceItem.where({ id: input.serviceItemId }).first();
        if (!service) throw new NotFoundError("Service item not found");
        if (!service.isActive) throw new ConflictError("This service is currently unavailable");

        const existing = await tx.orm.public.InvoiceItem
            .where({ invoiceId, serviceItemId: input.serviceItemId })
            .first();

        let itemId: string;
        if (existing) {
            const quantity = existing.quantity + input.quantity;
            if (quantity > 100) throw new BadRequestError("A line can have a quantity of at most 100");
            await tx.orm.public.InvoiceItem.where({ id: existing.id }).update({ quantity });
            itemId = existing.id;
        } else {
            const created = await tx.orm.public.InvoiceItem.create({
                invoiceId,
                serviceItemId: service.id,
                name: service.name,
                unitPrice: service.price,
                quantity: input.quantity,
            });
            itemId = created.id;
        }

        const calc = await recalculate(tx, invoiceId);
        return { id: itemId, total: calc.total };
    });
}

export async function updateInvoiceItem(
    invoiceId: string,
    itemId: string,
    input: UpdateInvoiceItemInput,
    session: Session
) {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST");

    return db.transaction(async (tx) => {
        await loadDraft(tx, invoiceId);

        const item = await tx.orm.public.InvoiceItem.where({ id: itemId, invoiceId }).first();
        if (!item) throw new NotFoundError("Invoice item not found");

        await tx.orm.public.InvoiceItem.where({ id: itemId }).update({ quantity: input.quantity });
        const calc = await recalculate(tx, invoiceId);
        return { total: calc.total };
    });
}

export async function removeInvoiceItem(invoiceId: string, itemId: string, session: Session) {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST");

    return db.transaction(async (tx) => {
        await loadDraft(tx, invoiceId);

        const item = await tx.orm.public.InvoiceItem.where({ id: itemId, invoiceId }).first();
        if (!item) throw new NotFoundError("Invoice item not found");

        await tx.orm.public.InvoiceItem.where({ id: itemId }).deleteAll();
        const calc = await recalculate(tx, invoiceId);
        return { total: calc.total };
    });
}

export async function setInvoiceDiscount(invoiceId: string, input: SetDiscountInput, session: Session) {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST");

    return db.transaction(async (tx) => {
        await loadDraft(tx, invoiceId);

        const invoice = await tx.orm.public.Invoice.where({ id: invoiceId }).include("items").first();
        if (!invoice) throw new NotFoundError("Invoice not found");

        const subtotal = invoice.roomCharge + invoice.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
        if (input.discount > subtotal) throw new BadRequestError("Discount cannot exceed the subtotal");

        await tx.orm.public.Invoice.where({ id: invoiceId }).update({ discount: input.discount });
        const calc = await recalculate(tx, invoiceId);
        return { total: calc.total };
    });
}

// the final bill: issues the invoice and records the payment, closes the stay, and hands the room to housekeeping
export async function checkOutReservation(reservationId: string, input: CheckOutInput, session: Session) {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST");

    return db.transaction(async (tx) => {
        const reservation = await tx.orm.public.Reservation.where({ id: reservationId }).first();
        if (!reservation) throw new NotFoundError("Reservation not found");
        if (reservation.status !== "CHECKED_IN") {
            throw new ConflictError(`A ${reservation.status.toLowerCase().replace("_", "-")} reservation cannot be checked out`);
        }

        const invoice = await tx.orm.public.Invoice.where({ reservationId }).first();
        if (!invoice) throw new ConflictError("This reservation has no invoice");
        if (invoice.status !== "DRAFT") throw new ConflictError("This invoice has already been settled");

        const calc = await recalculate(tx, invoice.id);
        const now = new Date();

        await tx.orm.public.Invoice.where({ id: invoice.id }).update({
            status: "PAID",
            paymentMethod: input.paymentMethod,
            paidAt: now,
            paidById: session.employeeId,
            issuedAt: now,
        });
        await tx.orm.public.Reservation
            .where({ id: reservationId })
            .update({ status: "CHECKED_OUT", actualCheckOut: now });

        if (reservation.roomId) {
            const roomId = reservation.roomId;

            const unresolved = await tx.orm.public.MaintenanceRequest
                .where({ roomId })
                .where((m) => m.status.neq("RESOLVED"))
                .first();
            await tx.orm.public.Room.where({ id: roomId }).update({ status: unresolved ? "MAINTENANCE" : "CLEANING" });

            const openTask = await tx.orm.public.HousekeepingTask
                .where({ roomId })
                .where((t) => t.status.in(["PENDING", "IN_PROGRESS"]))
                .first();
            if (!openTask) {
                await tx.orm.public.HousekeepingTask.create({
                    roomId,
                    assignedToId: null,
                    status: "PENDING",
                    notes: "Turnover clean after check-out",
                    startedAt: null,
                    completedAt: null,
                });
            }
        }

        return { invoiceId: invoice.id, total: calc.total, paidAt: now };
    });
}

export async function refundInvoice(invoiceId: string, input: RefundInput, session: Session) {
    assertRole(session, "ADMIN", "MANAGER");

    return db.transaction(async (tx) => {
        const invoice = await tx.orm.public.Invoice.where({ id: invoiceId }).first();
        if (!invoice) throw new NotFoundError("Invoice not found");
        if (invoice.status === "REFUNDED") throw new ConflictError("This invoice has already been refunded");
        if (invoice.status !== "PAID") throw new ConflictError("Only a paid invoice can be refunded");

        const amount = input.amount ?? invoice.total;
        if (amount > invoice.total) throw new BadRequestError("The refund cannot exceed the invoice total");

        await tx.orm.public.Invoice
            .where({ id: invoiceId })
            .update({ status: "REFUNDED", refundedAt: new Date(), refundAmount: amount });
        return { refundAmount: amount };
    });
}