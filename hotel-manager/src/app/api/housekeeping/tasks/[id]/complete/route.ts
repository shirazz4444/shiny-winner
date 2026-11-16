import { handle, ok } from "@/lib/apiResponse";
import { updateTaskSchema } from "@/schemas/housekeeping";
import { requireApiRole } from "@/services/authService";
import { getTask, updateTask } from "@/services/housekeepingService";

type Context = { params: Promise<{ id: string }> };

export const GET = handle(async (_request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING");
    const { id } = await params;
    return ok(await getTask(id, session));
});

export const PATCH = handle(async (request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER");
    const { id } = await params;
    const input = updateTaskSchema.parse(await request.json());
    await updateTask(id, input, session);
    return ok(null);
});