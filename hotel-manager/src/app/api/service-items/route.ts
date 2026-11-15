import { handle, ok } from "@/lib/apiResponse";
import { listCatalogSchema } from "@/schemas/catalog";
import { requireApiRole } from "@/services/authService";
import { listServiceItems } from "@/services/serviceItemService";

export const GET = handle(async (request) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST");
    const filters = listCatalogSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return ok(await listServiceItems(filters, session));
});