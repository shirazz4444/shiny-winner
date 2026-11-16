import { db, type Tx } from "@/prisma/db";
import { or } from "@prisma/orm-postgres/orm-client";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/apiResponse";
import { TAX_RATE, calculateInvoice } from "@/lib/calculateInvoice";
import { calendarDays, today } from "@/lib/dates";
import { assertRole, likePattern } from "@/lib/serviceHelpers";
import type { Session } from "@/services/authService";
import type {
    AvailableRoomsFilters,
    CheckInInput,
    CreateReservationInput,
    ListReservationsFilters,
    SetReservationStatusInput,
    UpdateReservationInput,
} from "@/schemas/reservation";

const BLOCKING: ("PENDING" | "CONFIRMED" | "CHECKED_IN")[] = ["PENDING", "CONFIRMED", "CHECKED_IN"];

// locks the room row so two bookings for the same room can't be checked at the same moment, then makes sure the guests fit and
// no other live reservation overlaps these dates (a check-out and a check-in on the same day don't overlap)
async function lockAndCheckRoom(
    tx: Tx,
    roomId: string,
    checkIn: string,
    checkOut: string,
    guests: number,
    excludeId?: string
) {
    const room = await tx.orm.public.Room.where({ id: roomId }).first();
    if (!room) throw new NotFoundError("Room not found");
    await tx.orm.public.Room.where({ id: roomId }).update({ roomNumber: room.roomNumber });

    if (guests > room.maxOccupancy) {
        throw new BadRequestError(`Room ${room.roomNumber} fits at most ${room.maxOccupancy} guests`);
    }

    let query = tx.orm.public.Reservation
        .where({ roomId })
        .where((r) => r.status.in(BLOCKING))
        .where((r) => r.checkInDate.lt(checkOut))
        .where((r) => r.checkOutDate.gt(checkIn));
    if (excludeId) query = query.where((r) => r.id.neq(excludeId));

    const clash = await query.first();
    if (clash) throw new ConflictError(`Room ${room.roomNumber} is already booked for part of these dates`);
    return room;
}

export async function listReservations(filters: ListReservationsFilters, session: Session) {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST");
    const { search, status, guestId, roomId, startDate, endDate, page, limit } = filters;

    let query = db.orm.public.Reservation.where({});
    if (status) query = query.where({ status });
    if (guestId) query = query.where({ guestId });
    if (roomId) query = query.where({ roomId });
    if (startDate) query = query.where((r) => r.checkInDate.gte(startDate));
    if (endDate) query = query.where((r) => r.checkInDate.lte(endDate));

    if (search) {
        const pattern = likePattern(search);
        const guests = await db.orm.public.Guest.where((g) => g.fullName.ilike(pattern)).select("id").all();
        const guestIds = guests.map((g) => g.id);
        query = query.where((r) =>
            guestIds.length > 0 ? or(r.id.ilike(pattern), r.guestId.in(guestIds)) : r.id.ilike(pattern)
        );
    }

    const { total } = await query.aggregate((a) => ({ total: a.count() }));
    const rows = await query
        .orderBy([(r) => r.checkInDate.desc(), (r) => r.id.desc()])
        .include("guest")
        .include("room")
        .limit(limit)
        .offset((page - 1) * limit)
        .all();

    const items = rows.map((r) => ({
        id: r.id,
        status: r.status,
        guestId: r.guestId,
        guestName: r.guest.fullName,
        roomId: r.roomId,
        roomNumber: r.room?.roomNumber ?? null,
        checkInDate: r.checkInDate,
        checkOutDate: r.checkOutDate,
        nights: Math.max(1, calendarDays(r.checkInDate, r.checkOutDate)),
        adults: r.adults,
        children: r.children,
    }));
    return { items, total, page, limit };
}

export async function getReservation(reservationId: string, session: Session) {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST");

    const r = await db.orm.public.Reservation
        .where({ id: reservationId })
        .include("guest")
        .include("room")
        .include("createdBy")
        .include("invoice")
        .first();
    if (!r) throw new NotFoundError("Reservation not found");

    return {
        id: r.id,
        status: r.status,
        checkInDate: r.checkInDate,
        checkOutDate: r.checkOutDate,
        nights: Math.max(1, calendarDays(r.checkInDate, r.checkOutDate)),
        adults: r.adults,
        children: r.children,
        actualCheckIn: r.actualCheckIn,
        actualCheckOut: r.actualCheckOut,
        notes: r.notes,
        cancelledAt: r.cancelledAt,
        createdAt: r.createdAt,
        createdBy: { id: r.createdBy.id, fullName: r.createdBy.fullName },
        guest: {
            id: r.guest.id,
            fullName: r.guest.fullName,
            email: r.guest.email,
            phone: r.guest.phone,
            address: r.guest.address,
        },
        room: r.room
            ? {
                id: r.room.id,
                roomNumber: r.room.roomNumber,
                categoryId: r.room.categoryId,
                price: r.room.price,
                maxOccupancy: r.room.maxOccupancy,
                status: r.room.status,
            }
            : null,
        invoice: r.invoice ? { id: r.invoice.id, status: r.invoice.status, total: r.invoice.total } : null,
    };
}

export async function getAvailableRooms(filters: AvailableRoomsFilters, session: Session) {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST");
    const { checkIn, checkOut, adults, children, categoryId, excludeReservationId } = filters;

    let overlapping = db.orm.public.Reservation
        .where((r) => r.status.in(BLOCKING))
        .where((r) => r.checkInDate.lt(checkOut))
        .where((r) => r.checkOutDate.gt(checkIn));
    if (excludeReservationId) overlapping = overlapping.where((r) => r.id.neq(excludeReservationId));

    const busy = await overlapping.select("roomId").all();
    const busyIds = busy.flatMap((b) => (b.roomId ? [b.roomId] : []));

    let query = db.orm.public.Room.where((r) => r.maxOccupancy.gte(adults + children));
    if (categoryId) query = query.where({ categoryId });
    if (busyIds.length > 0) query = query.where((r) => r.id.notIn(busyIds));

    const rooms = await query.orderBy([(r) => r.roomNumber.asc(), (r) => r.id.asc()]).include("category").all();
    const nights = Math.max(1, calendarDays(checkIn, checkOut));

    const items = rooms.map((r) => ({
        id: r.id,
        roomNumber: r.roomNumber,
        categoryId: r.categoryId,
        categoryName: r.category.name,
        price: r.price,
        maxOccupancy: r.maxOccupancy,
        status: r.status,
        images: r.images,
        estimatedTotal: r.price * nights,
    }));
    return { items, nights };
}

export async function createReservation(input: CreateReservationInput, session: Session) {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST");

    if (input.checkInDate < today()) throw new BadRequestError("The check-in date cannot be in the past");
    if (input.status === "CONFIRMED" && !input.roomId) throw new BadRequestError("Assign a room before confirming");

    return db.transaction(async (tx) => {
        const guest = await tx.orm.public.Guest.where({ id: input.guestId }).first();
        if (!guest) throw new NotFoundError("Guest not found");

        if (input.roomId) {
            await lockAndCheckRoom(tx, input.roomId, input.checkInDate, input.checkOutDate, input.adults + input.children);
        }

        const reservation = await tx.orm.public.Reservation.create({
            guestId: input.guestId,
            roomId: input.roomId,
            status: input.status,
            checkInDate: input.checkInDate,
            checkOutDate: input.checkOutDate,
            adults: input.adults,
            children: input.children,
            actualCheckIn: null,
            actualCheckOut: null,
            notes: input.notes,
            createdById: session.employeeId,
            cancelledAt: null,
        });
        return { id: reservation.id };
    });
}

export async function updateReservation(
    reservationId: string,
    input: UpdateReservationInput,
    session: Session
): Promise<void> {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST");

    await db.transaction(async (tx) => {
        const r = await tx.orm.public.Reservation.where({ id: reservationId }).first();
        if (!r) throw new NotFoundError("Reservation not found");
        if (r.status !== "PENDING" && r.status !== "CONFIRMED") {
            throw new ConflictError(`A ${r.status.toLowerCase().replace("_", "-")} reservation can no longer be modified`);
        }

        const next = {
            guestId: input.guestId ?? r.guestId,
            roomId: input.roomId !== undefined ? input.roomId : r.roomId,
            checkInDate: input.checkInDate ?? r.checkInDate,
            checkOutDate: input.checkOutDate ?? r.checkOutDate,
            adults: input.adults ?? r.adults,
            children: input.children ?? r.children,
            notes: input.notes !== undefined ? input.notes : r.notes,
        };

        if (next.checkOutDate <= next.checkInDate) throw new BadRequestError("Check-out must be after check-in");
        if (next.checkInDate !== r.checkInDate && next.checkInDate < today()) {
            throw new BadRequestError("The check-in date cannot be in the past");
        }
        if (r.status === "CONFIRMED" && !next.roomId) throw new ConflictError("A confirmed reservation needs a room");

        if (next.guestId !== r.guestId) {
            const guest = await tx.orm.public.Guest.where({ id: next.guestId }).first();
            if (!guest) throw new NotFoundError("Guest not found");
        }
        if (next.roomId) {
            await lockAndCheckRoom(
                tx,
                next.roomId,
                next.checkInDate,
                next.checkOutDate,
                next.adults + next.children,
                reservationId
            );
        }

        await tx.orm.public.Reservation.where({ id: reservationId }).update(next);
    });
}

// checking in and out go through their own actions because they change the room; every other status can be set here
export async function setReservationStatus(
    reservationId: string,
    input: SetReservationStatusInput,
    session: Session
): Promise<void> {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST");

    await db.transaction(async (tx) => {
        const r = await tx.orm.public.Reservation.where({ id: reservationId }).first();
        if (!r) throw new NotFoundError("Reservation not found");
        if (r.status === "CHECKED_IN") throw new ConflictError("A checked-in reservation can only be closed by checking out");
        if (r.status === "CHECKED_OUT") throw new ConflictError("A checked-out reservation can no longer be changed");
        if (input.status === r.status) return;

        if (input.status === "CONFIRMED" && !r.roomId) throw new ConflictError("Assign a room before confirming");

        const reopening =
            (r.status === "CANCELLED" || r.status === "NO_SHOW") &&
            (input.status === "PENDING" || input.status === "CONFIRMED");
        if (reopening && r.roomId) {
            await lockAndCheckRoom(tx, r.roomId, r.checkInDate, r.checkOutDate, r.adults + r.children, reservationId);
        }

        await tx.orm.public.Reservation.where({ id: reservationId }).update({
            status: input.status,
            cancelledAt: input.status === "CANCELLED" ? new Date() : null,
        });
    });
}

// records the real check-in time, marks the room Occupied, and opens the draft invoice with the room charge
export async function checkInReservation(reservationId: string, input: CheckInInput, session: Session) {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST");

    return db.transaction(async (tx) => {
        const r = await tx.orm.public.Reservation.where({ id: reservationId }).first();
        if (!r) throw new NotFoundError("Reservation not found");
        if (r.status !== "PENDING" && r.status !== "CONFIRMED") {
            throw new ConflictError(`A ${r.status.toLowerCase().replace("_", "-")} reservation cannot be checked in`);
        }
        if (r.checkInDate > today()) throw new ConflictError(`Check-in opens on ${r.checkInDate}`);

        const roomId = input.roomId ?? r.roomId;
        if (!roomId) throw new ConflictError("Assign a room before checking in");

        const room = await lockAndCheckRoom(tx, roomId, r.checkInDate, r.checkOutDate, r.adults + r.children, reservationId);
        if (room.status !== "AVAILABLE" && room.status !== "RESERVED") {
            throw new ConflictError(`Room ${room.roomNumber} is ${room.status.toLowerCase()} and cannot be checked into`);
        }

        await tx.orm.public.Reservation
            .where({ id: reservationId })
            .update({ roomId, status: "CHECKED_IN", actualCheckIn: new Date() });
        await tx.orm.public.Room.where({ id: roomId }).update({ status: "OCCUPIED" });

        let invoice = await tx.orm.public.Invoice.where({ reservationId }).first();
        if (!invoice) {
            const roomCharge = room.price * Math.max(1, calendarDays(r.checkInDate, r.checkOutDate));
            const calc = calculateInvoice({ roomCharge, items: [], discount: 0, taxRate: TAX_RATE });
            invoice = await tx.orm.public.Invoice.create({
                reservationId,
                roomCharge,
                subtotal: calc.subtotal,
                taxRate: TAX_RATE,
                taxAmount: calc.taxAmount,
                discount: 0,
                total: calc.total,
                status: "DRAFT",
                paymentMethod: null,
                paidAt: null,
                paidById: null,
                refundedAt: null,
                refundAmount: null,
                issuedAt: null,
            });
        }
        return { roomId, invoiceId: invoice.id };
    });
}