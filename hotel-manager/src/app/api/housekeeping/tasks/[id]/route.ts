import { handle, ok } from "@/lib/apiResponse";
import { requireApiRole } from "@/services/authService";
import { completeTask } from "@/services/housekeepingService";

type Context = { params: Promise<{ id: string }> };

export const POST = handle(async (_request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "HOUSEKEEPING");
    const { id } = await params;
    await completeTask(id, session);
    return ok(null);
});