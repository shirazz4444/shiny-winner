import { db } from "@/prisma/db";
import { addDays, monthStart, nextMonthStart, today, weekStart } from "@/lib/dates";
import { assertRole } from "@/lib/serviceHelpers";
import type { Session } from "@/services/authService";
import type { CalendarFilters } from "@/schemas/calendar";

export async function getCalendar(filters: CalendarFilters, session: Session) {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST");
    const { view, status } = filters;
    const date = filters.date ?? today();

    let start: string;
    let end: string;
    if (view === "daily") {
        start = date;
        end = addDays(date, 1);
    } else if (view === "weekly") {
        start = weekStart(date);
        end = addDays(start, 7);
    } else {
        start = monthStart(date);
        end = nextMonthStart(date);
    }

    let query = db.orm.public.Reservation
        .where((r) => r.checkInDate.lt(end))
        .where((r) => r.checkOutDate.gte(start));
    if (status) query = query.where({ status });

    const rows = await query
        .orderBy([(r) => r.checkInDate.asc(), (r) => r.id.asc()])
        .include("guest")
        .include("room")
        .all();

    const reservations = rows.map((r) => ({
        id: r.id,
        status: r.status,
        guestId: r.guestId,
        guestName: r.guest.fullName,
        roomId: r.roomId,
        roomNumber: r.room?.roomNumber ?? null,
        checkInDate: r.checkInDate,
        checkOutDate: r.checkOutDate,
        adults: r.adults,
        children: r.children,
    }));
    return { view, start, end, reservations };
}