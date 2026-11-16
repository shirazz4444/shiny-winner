import { handle, ok } from "@/lib/apiResponse";
import { createMaintenanceSchema, listMaintenanceSchema } from "@/schemas/maintenance";
import { requireApiRole } from "@/services/authService";
import { createMaintenanceRequest, listMaintenanceRequests } from "@/services/maintenanceService";

export const GET = handle(async (request) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING");
    const filters = listMaintenanceSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return ok(await listMaintenanceRequests(filters, session));
});

export const POST = handle(async (request) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING");
    const input = createMaintenanceSchema.parse(await request.json());
    return ok(await createMaintenanceRequest(input, session), 201);
});