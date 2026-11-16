import { handle, ok } from "@/lib/apiResponse";
import { createTaskSchema, listTasksSchema } from "@/schemas/housekeeping";
import { requireApiRole } from "@/services/authService";
import { createTask, listTasks } from "@/services/housekeepingService";

export const GET = handle(async (request) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING");
    const filters = listTasksSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return ok(await listTasks(filters, session));
});

export const POST = handle(async (request) => {
    const session = await requireApiRole("ADMIN", "MANAGER");
    const input = createTaskSchema.parse(await request.json());
    return ok(await createTask(input, session), 201);
});