import { db } from "@/prisma/db";
import { addDays, eachDay, today } from "@/lib/dates";
import { netRevenue } from "@/lib/revenue";
import { assertRole } from "@/lib/serviceHelpers";
import type { Session } from "@/services/authService";
import type { DashboardChartsFilters } from "@/schemas/dashboard";

function lastMonths(count: number): string[] {
    const now = new Date();
    const months: string[] = [];
    for (let i = count - 1; i >= 0; i--) {
        months.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7));
    }
    return months;
}

export async function getDashboardKpis(session: Session) {
    assertRole(session, "ADMIN", "MANAGER");
    const date = today();

    const rooms = await db.orm.public.Room.select("status").all();

    const openHousekeepingTasks = db.orm.public.HousekeepingTask
        .where({ status: "PENDING" })
        .all

    const openMaintenanceRequests = db.orm.public.MaintenanceRequest
        .where({ status: "OPEN" })
        .all

    const { total: todaysCheckIns } = await db.orm.public.Reservation
        .where({ checkInDate: date })
        .where((r) => r.status.notIn(["CANCELLED", "NO_SHOW"]))
        .aggregate((a) => ({ total: a.count() }));

    const { total: todaysCheckOuts } = await db.orm.public.Reservation
        .where({ checkOutDate: date })
        .where((r) => r.status.in(["CHECKED_IN", "CHECKED_OUT"]))
        .aggregate((a) => ({ total: a.count() }));

    const { total: pendingReservations } = await db.orm.public.Reservation
        .where({ status: "PENDING" })
        .aggregate((a) => ({ total: a.count() }));

    const invoices = await db.orm.public.Invoice
        .where((i) => i.status.in(["PAID", "REFUNDED"]))
        .select("status", "total", "refundAmount")
        .all();

    return {
        totalRooms: rooms.length,
        openTasks: openHousekeepingTasks.length + openMaintenanceRequests.length,
        availableRooms: rooms.filter((r) => r.status === "AVAILABLE").length,
        occupiedRooms: rooms.filter((r) => r.status === "OCCUPIED").length,
        todaysCheckIns,
        todaysCheckOuts,
        totalRevenue: invoices.reduce((sum, i) => sum + netRevenue(i), 0),
        pendingReservations,
    };
}

export async function getDashboardCharts(filters: DashboardChartsFilters, session: Session) {
    assertRole(session, "ADMIN", "MANAGER");

    const end = today();
    const start = addDays(end, -(filters.days - 1));
    const days = eachDay(start, end);
    const months = lastMonths(filters.months);

    const { total: totalRooms } = await db.orm.public.Room.where({}).aggregate((a) => ({ total: a.count() }));

    const paid = await db.orm.public.Invoice
        .where((i) => i.status.in(["PAID", "REFUNDED"]))
        .where((i) => i.paidAt.gte(new Date(`${months[0]}-01T00:00:00.000Z`)))
        .select("status", "total", "refundAmount", "paidAt")
        .all();
    const perMonth = new Map<string, number>();
    for (const p of paid) {
        if (!p.paidAt) continue;
        const key = p.paidAt.toISOString().slice(0, 7);
        perMonth.set(key, (perMonth.get(key) ?? 0) + netRevenue(p));
    }
    const monthlyRevenue = months.map((month) => ({ month, revenue: perMonth.get(month) ?? 0 }));

    const stays = await db.orm.public.Reservation
        .where((r) => r.status.in(["CHECKED_IN", "CHECKED_OUT"]))
        .where((r) => r.checkInDate.lte(end))
        .where((r) => r.checkOutDate.gt(start))
        .select("checkInDate", "checkOutDate")
        .all();
    const occupancy = days.map((date) => {
        const occupiedRooms = stays.filter((s) => s.checkInDate <= date && date < s.checkOutDate).length;
        return {
            date,
            occupiedRooms,
            occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 1000) / 10 : 0,
        };
    });

    const arrivals = await db.orm.public.Reservation
        .where((r) => r.status.notIn(["CANCELLED", "NO_SHOW"]))
        .where((r) => r.checkInDate.gte(start))
        .where((r) => r.checkInDate.lte(end))
        .select("checkInDate")
        .all();
    const perDay = new Map<string, number>();
    for (const a of arrivals) perDay.set(a.checkInDate, (perDay.get(a.checkInDate) ?? 0) + 1);
    const bookingTrends = days.map((date) => ({ date, bookings: perDay.get(date) ?? 0 }));

    const categories = await db.orm.public.RoomCategory
        .where({})
        .orderBy([(c) => c.basePrice.asc(), (c) => c.id.asc()])
        .all();
    const rooms = await db.orm.public.Room.select("id", "categoryId").all();
    const categoryOf = new Map(rooms.map((r) => [r.id, r.categoryId]));
    const booked = await db.orm.public.Reservation
        .where((r) => r.status.notIn(["CANCELLED", "NO_SHOW"]))
        .select("roomId")
        .all();
    const perCategory = new Map<string, number>();
    for (const b of booked) {
        const categoryId = b.roomId ? categoryOf.get(b.roomId) : undefined;
        if (categoryId) perCategory.set(categoryId, (perCategory.get(categoryId) ?? 0) + 1);
    }
    const reservationsByRoomType = categories.map((c) => ({
        categoryId: c.id,
        category: c.name,
        reservations: perCategory.get(c.id) ?? 0,
    }));

    return { monthlyRevenue, occupancy, reservationsByRoomType, bookingTrends };
}