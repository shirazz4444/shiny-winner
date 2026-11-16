import { handle, ok } from "@/lib/apiResponse";
import { updateMaintenanceSchema } from "@/schemas/maintenance";
import { requireApiRole } from "@/services/authService";
import { getMaintenanceRequest, updateMaintenanceRequest } from "@/services/maintenanceService";

type Context = { params: Promise<{ id: string }> };

export const GET = handle(async (_request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING");
    const { id } = await params;
    return ok(await getMaintenanceRequest(id, session));
});

export const PATCH = handle(async (request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER");
    const { id } = await params;
    const input = updateMaintenanceSchema.parse(await request.json());
    await updateMaintenanceRequest(id, input, session);
    return ok(null);
});