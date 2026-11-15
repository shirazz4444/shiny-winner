import { db } from "@/prisma/db";
import { assertRole } from "@/lib/serviceHelpers";
import type { Session } from "@/services/authService";
import type { ListCatalogFilters } from "@/schemas/catalog";

export async function listRoomCategories(filters: ListCatalogFilters, session: Session) {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST");

    let query = db.orm.public.RoomCategory.where({});
    if (!filters.includeInactive) query = query.where({ isActive: true });

    const rows = await query.orderBy([(c) => c.basePrice.asc(), (c) => c.id.asc()]).all();

    const items = rows.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        basePrice: c.basePrice,
        maxOccupancy: c.maxOccupancy,
        isActive: c.isActive,
    }));
    return { items };
}