import { handle, ok } from "@/lib/apiResponse";
import { listCatalogSchema } from "@/schemas/catalog";
import { requireApiRole } from "@/services/authService";
import { listRoomCategories } from "@/services/roomCategoryService";

export const GET = handle(async (request) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST");
    const filters = listCatalogSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return ok(await listRoomCategories(filters, session));
});