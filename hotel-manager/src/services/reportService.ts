import { db } from "@/prisma/db";
import { BadRequestError } from "@/lib/apiResponse";
import type { Report } from "@/lib/csv";
import { addDays, calendarDays, dateOf, eachDay, monthStart, nextMonthStart, today, weekStart } from "@/lib/dates";
import { netRevenue } from "@/lib/revenue";
import { assertRole } from "@/lib/serviceHelpers";
import type { Session } from "@/services/authService";
import type { ReportFilters, RevenueReportFilters } from "@/schemas/report";

const MAX_RANGE_DAYS = 366;

const startOfDay = (date: string) => new Date(`${date}T00:00:00.000Z`);
const endOfDay = (date: string) => new Date(`${date}T23:59:59.999Z`);
const round1 = (n: number) => Math.round(n * 10) / 10;

function resolveRange(filters: { startDate?: string; endDate?: string }) {
    const end = filters.endDate ?? today();
    const start = filters.startDate ?? addDays(end, -29);
    if (start > end) throw new BadRequestError("The start date must be on or before the end date");
    if (calendarDays(start, end) > MAX_RANGE_DAYS) {
        throw new BadRequestError(`The date range cannot be longer than ${MAX_RANGE_DAYS} days`);
    }
    return { start, end };
}

function periodKeys(start: string, end: string, period: "daily" | "weekly" | "monthly"): string[] {
    if (period === "daily") return eachDay(start, end);

    const keys: string[] = [];
    if (period === "weekly") {
        for (let d = weekStart(start); d <= end; d = addDays(d, 7)) keys.push(d);
    } else {
        for (let d = monthStart(start); d <= end; d = nextMonthStart(d)) keys.push(d.slice(0, 7));
    }
    return keys;
}

export async function getRevenueReport(filters: RevenueReportFilters, session: Session): Promise<Report> {
    assertRole(session, "ADMIN", "MANAGER");
    const { start, end } = resolveRange(filters);
    const { period } = filters;

    const invoices = await db.orm.public.Invoice
        .where((i) => i.status.in(["PAID", "REFUNDED"]))
        .where((i) => i.paidAt.gte(startOfDay(start)))
        .where((i) => i.paidAt.lte(endOfDay(end)))
        .select("status", "total", "refundAmount", "paidAt")
        .all();

    const buckets = new Map<string, { invoices: number; gross: number; refunds: number }>();
    for (const key of periodKeys(start, end, period)) buckets.set(key, { invoices: 0, gross: 0, refunds: 0 });

    for (const i of invoices) {
        if (!i.paidAt) continue;
        const day = dateOf(i.paidAt);
        const key = period === "daily" ? day : period === "weekly" ? weekStart(day) : day.slice(0, 7);
        const bucket = buckets.get(key);
        if (!bucket) continue;
        bucket.invoices += 1;
        bucket.gross += i.total;
        bucket.refunds += i.status === "REFUNDED" ? i.refundAmount ?? 0 : 0;
    }

    const rows = [...buckets.entries()].map(([key, b]) => ({
        period: key,
        invoices: b.invoices,
        gross: b.gross,
        refunds: b.refunds,
        net: b.gross - b.refunds,
    }));

    return {
        columns: [
            { key: "period", label: period === "weekly" ? "Week starting" : period === "monthly" ? "Month" : "Date" },
            { key: "invoices", label: "Invoices Processed" },
            { key: "gross", label: "Gross Revenue", money: true },
            { key: "refunds", label: "Refunds", money: true },
            { key: "net", label: "Net Revenue", money: true },
        ],
        rows,
        summary: {
            startDate: start,
            endDate: end,
            period,
            totalInvoices: rows.reduce((sum, r) => sum + r.invoices, 0),
            grossRevenue: rows.reduce((sum, r) => sum + r.gross, 0),
            refunds: rows.reduce((sum, r) => sum + r.refunds, 0),
            netRevenue: rows.reduce((sum, r) => sum + r.net, 0),
        },
    };
}

export async function getOccupancyReport(filters: ReportFilters, session: Session): Promise<Report> {
    assertRole(session, "ADMIN", "MANAGER");
    const { start, end } = resolveRange(filters);

    const { total: totalRooms } = await db.orm.public.Room.where({}).aggregate((a) => ({ total: a.count() }));

    const stays = await db.orm.public.Reservation
        .where((r) => r.status.in(["CHECKED_IN", "CHECKED_OUT"]))
        .where((r) => r.checkInDate.lte(end))
        .where((r) => r.checkOutDate.gt(start))
        .select("checkInDate", "checkOutDate")
        .all();

    const rows = eachDay(start, end).map((date) => {
        const occupiedRooms = stays.filter((s) => s.checkInDate <= date && date < s.checkOutDate).length;
        return {
            date,
            occupiedRooms,
            totalRooms,
            occupancyRate: totalRooms > 0 ? round1((occupiedRooms / totalRooms) * 100) : 0,
        };
    });

    const roomNights = rows.reduce((sum, r) => sum + r.occupiedRooms, 0);
    return {
        columns: [
            { key: "date", label: "Date" },
            { key: "occupiedRooms", label: "Occupied Rooms" },
            { key: "totalRooms", label: "Total Rooms" },
            { key: "occupancyRate", label: "Occupancy Rate (%)" },
        ],
        rows,
        summary: {
            startDate: start,
            endDate: end,
            totalRoomNights: roomNights,
            averageOccupancyRate: rows.length > 0 && totalRooms > 0 ? round1((roomNights / (rows.length * totalRooms)) * 100) : 0,
        },
    };
}

export async function getCancellationReport(filters: ReportFilters, session: Session): Promise<Report> {
    assertRole(session, "ADMIN", "MANAGER");
    const { start, end } = resolveRange(filters);

    const cancelled = await db.orm.public.Reservation
        .where({ status: "CANCELLED" })
        .where((r) => r.cancelledAt.gte(startOfDay(start)))
        .where((r) => r.cancelledAt.lte(endOfDay(end)))
        .include("guest")
        .include("room")
        .all();

    const rows = cancelled
        .map((r) => ({
            reservationId: r.id,
            guest: r.guest.fullName,
            room: r.room?.roomNumber ?? null,
            checkInDate: r.checkInDate,
            checkOutDate: r.checkOutDate,
            cancelledAt: r.cancelledAt ? r.cancelledAt.toISOString() : null,
        }))
        .sort((a, b) => {
            if (!a.cancelledAt) return 1;
            if (!b.cancelledAt) return -1;
            return a.cancelledAt.localeCompare(b.cancelledAt);
        });

    return {
        columns: [
            { key: "reservationId", label: "Reservation ID" },
            { key: "guest", label: "Guest" },
            { key: "room", label: "Room" },
            { key: "checkInDate", label: "Scheduled Check-in" },
            { key: "checkOutDate", label: "Scheduled Check-out" },
            { key: "cancelledAt", label: "Cancelled at" },
        ],
        rows,
        summary: {
            startDate: start,
            endDate: end,
            totalCancelled: rows.length,
        },
    };
}

export async function getRoomCategoryReport(filters: ReportFilters, session: Session): Promise<Report> {
    assertRole(session, "ADMIN", "MANAGER");
    const { start, end } = resolveRange(filters);

    const categories = await db.orm.public.RoomCategory.where({}).all();
    const rooms = await db.orm.public.Room.select("id", "categoryId").all();
    const categoryOf = new Map(rooms.map((r) => [r.id, r.categoryId]));

    const bookings = await db.orm.public.Reservation
        .where((r) => r.status.notIn(["CANCELLED", "NO_SHOW"]))
        .where((r) => r.checkInDate.gte(start))
        .where((r) => r.checkInDate.lte(end))
        .include("invoice")
        .select("roomId", "checkInDate", "checkOutDate")
        .all();

    const stats = new Map<string, { bookings: number; roomNights: number; revenue: number }>();

    for (const booking of bookings) {
        const categoryId = booking.roomId ? categoryOf.get(booking.roomId) : undefined;
        if (!categoryId) continue;

        const entry = stats.get(categoryId) ?? {
            bookings: 0,
            roomNights: 0,
            revenue: 0,
        };

        entry.bookings += 1;
        entry.roomNights += Math.max(1, calendarDays(booking.checkInDate, booking.checkOutDate));
        entry.revenue += booking.invoice ? netRevenue(booking.invoice) : 0;

        stats.set(categoryId, entry);
    }

    const totalBookings = [...stats.values()].reduce((sum, s) => sum + s.bookings, 0);

    const rows = categories
        .map((category) => {
            const s = stats.get(category.id) ?? { bookings: 0, roomNights: 0, revenue: 0 };

            return {
                category: category.name,
                bookings: s.bookings,
                roomNights: s.roomNights,
                sharePercent: totalBookings > 0 ? round1((s.bookings / totalBookings) * 100) : 0,
                revenue: s.revenue,
            };
        })
        .sort((a, b) => b.bookings - a.bookings || a.category.localeCompare(b.category));

    return {
        columns: [
            { key: "category", label: "Room Category" },
            { key: "bookings", label: "Bookings" },
            { key: "roomNights", label: "Room Nights" },
            { key: "sharePercent", label: "Share of Bookings (%)" },
            { key: "revenue", label: "Revenue", money: true },
        ],
        rows,
        summary: {
            startDate: start,
            endDate: end,
            totalBookings,
            mostPopular: totalBookings > 0 ? rows[0].category : null,
        },
    };
}

export async function getGuestReport(filters: ReportFilters, session: Session): Promise<Report> {
    assertRole(session, "ADMIN", "MANAGER");
    const { start, end } = resolveRange(filters);

    const stays = await db.orm.public.Reservation
        .where((r) => r.status.in(["CHECKED_IN", "CHECKED_OUT"]))
        .where((r) => r.checkInDate.lte(end))
        .where((r) => r.checkOutDate.gt(start))
        .include("guest")
        .include("invoice")
        .all();

    const guestIds = [...new Set(stays.map((s) => s.guestId))];

    const previousStays = guestIds.length > 0
        ? await db.orm.public.Reservation
            .where((r) => r.guestId.in(guestIds))
            .where((r) => r.status.in(["CHECKED_IN", "CHECKED_OUT"]))
            .where((r) => r.checkOutDate.lte(start))
            .select("guestId")
            .all()
        : [];

    const repeatGuestIds = new Set(previousStays.map((s) => s.guestId));

    const perGuest = new Map<string, { name: string; stays: number; nights: number; spent: number }>();

    for (const s of stays) {
        const entry = perGuest.get(s.guestId) ?? {
            name: s.guest.fullName,
            stays: 0,
            nights: 0,
            spent: 0,
        };

        entry.stays += 1;
        entry.nights += Math.max(1, calendarDays(s.checkInDate, s.checkOutDate));
        entry.spent += s.invoice ? netRevenue(s.invoice) : 0;

        perGuest.set(s.guestId, entry);
    }

    const rows = [...perGuest.entries()]
        .map(([guestId, g]) => ({
            guestId,
            guest: g.name,
            stays: g.stays,
            nights: g.nights,
            averageNights: round1(g.nights / g.stays),
            spent: g.spent,
        }))
        .sort((a, b) => {
            const firstA = a.guest.trim().split(/\s+/).at(0) ?? "";
            const firstB = b.guest.trim().split(/\s+/).at(0) ?? "";
            return firstA.localeCompare(firstB) || a.guest.localeCompare(b.guest);
        });

    const totalStays = rows.reduce((sum, r) => sum + r.stays, 0);
    const totalNights = rows.reduce((sum, r) => sum + r.nights, 0);

    return {
        columns: [
            { key: "guest", label: "Guest" },
            { key: "stays", label: "Stays" },
            { key: "nights", label: "Nights" },
            { key: "averageNights", label: "Average Nights" },
            { key: "spent", label: "Total Spent", money: true },
        ],
        rows,
        summary: {
            startDate: start,
            endDate: end,
            uniqueGuests: rows.length,
            totalStays,
            averageStayNights: totalStays > 0 ? round1(totalNights / totalStays) : 0,
            repeatGuests: rows.filter((r) => repeatGuestIds.has(r.guestId)).length,
            totalSpent: rows.reduce((sum, r) => sum + r.spent, 0),
        },
    };
}

export async function getStaffTaskReport(filters: ReportFilters, session: Session): Promise<Report> {
    assertRole(session, "ADMIN", "MANAGER");
    const { start, end } = resolveRange(filters);
    const from = startOfDay(start);
    const to = endOfDay(end);

    const staff = await db.orm.public.Employee
        .where({ role: "HOUSEKEEPING" })
        .all();

    const ids = staff.map((e) => e.id);

    const tasks = ids.length > 0
        ? await db.orm.public.HousekeepingTask
            .where((t) => t.assignedToId.in(ids))
            .select("assignedToId", "status", "startedAt", "completedAt")
            .all()
        : [];

    const rows = staff.map((e) => {
        const mine = tasks.filter((t) => t.assignedToId === e.id);
        const done = mine.filter(
            (t) => t.status === "COMPLETED" &&
                t.completedAt &&
                t.completedAt >= from &&
                t.completedAt <= to
        );

        const minutes = done
            .filter((t) => t.startedAt && t.completedAt)
            .map((t) => (t.completedAt!.getTime() - t.startedAt!.getTime()) / 60_000);

        return {
            employeeId: e.id,
            employee: e.fullName,
            active: e.isActive ? "Yes" : "No",
            completed: done.length,
            averageMinutes: minutes.length > 0
                ? Math.round(minutes.reduce((sum, n) => sum + n, 0) / minutes.length)
                : null,
        };
    }).sort((a, b) => {
        const firstA = a.employee.trim().split(/\s+/)[0] ?? "";
        const firstB = b.employee.trim().split(/\s+/)[0] ?? "";
        return firstA.localeCompare(firstB) || a.employee.localeCompare(b.employee);
    });

    return {
        columns: [
            { key: "employee", label: "Employee" },
            { key: "active", label: "Active" },
            { key: "completed", label: "Tasks Completed" },
            { key: "averageMinutes", label: "Average minutes per task" },
        ],
        rows,
        summary: {
            startDate: start,
            endDate: end,
            totalCompleted: rows.reduce((sum, r) => sum + r.completed, 0),
        },
    };
}
