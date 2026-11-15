import { db } from "@/prisma/db";
import { assertRole } from "@/lib/serviceHelpers";
import type { Session } from "@/services/authService";
import type { ListCatalogFilters } from "@/schemas/catalog";

export async function listServiceItems(filters: ListCatalogFilters, session: Session) {
    assertRole(session, "ADMIN", "MANAGER", "RECEPTIONIST");

    let query = db.orm.public.ServiceItem.where({});
    if (!filters.includeInactive) query = query.where({ isActive: true });

    const rows = await query.orderBy([(s) => s.name.asc(), (s) => s.id.asc()]).all();

    const items = rows.map((s) => ({
        id: s.id,
        name: s.name,
        price: s.price,
        isActive: s.isActive,
    }));
    return { items };
}