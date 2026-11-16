import { db } from "@/prisma/db";
import { or } from "@prisma/orm-postgres/orm-client";
import { NotFoundError } from "@/lib/apiResponse";
import { assertRole, likePattern } from "@/lib/serviceHelpers";
import type { Session } from "@/services/authService";
import type { CreateGuestInput, ListGuestsFilters, UpdateGuestInput } from "@/schemas/guest";

const DAY = 86_400_000;

type StatRow = {
    status: string;
    checkInDate: string | Date;
    checkOutDate: string | Date;
    invoice: { status: string; total: number; refundAmount: number | null } | null;
};

function calendarDays(checkIn: string | Date, checkOut: string | Date): number {
    return Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / DAY);
}

// totalStays and totalDays count only checked-out reservations, and totalSpent is paid invoices minus any refunds (all in cents)
function statsOf(reservations: StatRow[]) {
    const stays = reservations.filter((r) => r.status === "CHECKED_OUT");
    const totalDays = stays.reduce((sum, r) => sum + Math.max(1, calendarDays(r.checkInDate, r.checkOutDate)), 0);
    const totalSpent = reservations.reduce((sum, r) => {
        const invoice = r.invoice;
        if (!invoice) return sum;
        if (invoice.status === "PAID") return sum + invoice.total;
        if (invoice.status === "REFUNDED") return sum + invoice.total - (invoice.refundAmount ?? 0);
        return sum;
    }, 0);

    return { totalStays: stays.length, totalDays, totalSpent };
}

function toGuest(g: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    address: string;
    createdAt: Date;
}) {
    return {
        id: g.id,
        fullName: g.fullName,
        email: g.email,
        phone: g.phone,
        address: g.address,
        createdAt: g.createdAt,
    };
}

export async function listGuests(filters: ListGuestsFilters, session: Session) {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST");
    const { search, page, limit } = filters;

    let query = db.orm.public.Guest.where({});
    if (search) {
        const pattern = likePattern(search);
        query = query.where((g) => or(g.fullName.ilike(pattern), g.email.ilike(pattern), g.phone.ilike(pattern)));
    }

    const { total } = await query.aggregate((a) => ({ total: a.count() }));
    const rows = await query
        .orderBy([(g) => g.fullName.asc(), (g) => g.id.asc()])
        .limit(limit)
        .offset((page - 1) * limit)
        .all();

    const ids = rows.map((g) => g.id);
    const reservations =
        ids.length > 0
            ? await db.orm.public.Reservation.where((r) => r.guestId.in(ids)).include("invoice").all()
            : [];

    const items = rows.map((g) => ({
        ...toGuest(g),
        ...statsOf(reservations.filter((r) => r.guestId === g.id)),
    }));
    return { items, total, page, limit };
}

export async function getGuest(guestId: string, session: Session) {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST");

    const guest = await db.orm.public.Guest.where({ id: guestId }).first();
    if (!guest) throw new NotFoundError("Guest not found");

    const reservations = await db.orm.public.Reservation
        .where({ guestId })
        .orderBy([(r) => r.checkInDate.desc(), (r) => r.id.desc()])
        .include("room")
        .include("invoice")
        .all();

    return {
        ...toGuest(guest),
        ...statsOf(reservations),
        reservations: reservations.map((r) => ({
            id: r.id,
            status: r.status,
            checkInDate: r.checkInDate,
            checkOutDate: r.checkOutDate,
            nights: Math.max(1, calendarDays(r.checkInDate, r.checkOutDate)),
            roomNumber: r.room?.roomNumber ?? null,
            invoiceStatus: r.invoice?.status ?? null,
            invoiceTotal: r.invoice?.total ?? null,
        })),
    };
}

export async function createGuest(input: CreateGuestInput, session: Session) {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST");

    const guest = await db.orm.public.Guest.create({
        fullName: input.fullName,
        email: input.email.toLowerCase(),
        phone: input.phone,
        address: input.address,
    });
    return { id: guest.id };
}

export async function updateGuest(guestId: string, input: UpdateGuestInput, session: Session): Promise<void> {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST");
    const { email, ...rest } = input;

    const guest = await db.orm.public.Guest.where({ id: guestId }).first();
    if (!guest) throw new NotFoundError("Guest not found");

    await db.orm.public.Guest.where({ id: guestId }).update({
        ...rest,
        ...(email !== undefined && { email: email.toLowerCase() }),
    });
}