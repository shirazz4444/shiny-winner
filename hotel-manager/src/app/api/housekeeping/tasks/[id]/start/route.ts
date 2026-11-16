import { handle, ok } from "@/lib/apiResponse";
import { requireApiRole } from "@/services/authService";
import { startTask } from "@/services/housekeepingService";

type Context = { params: Promise<{ id: string }> };

export const POST = handle(async (_request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "HOUSEKEEPING");
    const { id } = await params;
    await startTask(id, session);
    return ok(null);
});