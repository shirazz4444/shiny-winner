import { handle, ok } from "@/lib/apiResponse";
import { updateEmployeeSchema } from "@/schemas/employee";
import { requireApiRole } from "@/services/authService";
import { getEmployee, updateEmployee } from "@/services/employeeService";

type Context = { params: Promise<{ id: string }> };

export const GET = handle(async (_request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER");
    const { id } = await params;
    return ok(await getEmployee(id, session));
});

export const PATCH = handle(async (request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER");
    const { id } = await params;
    const input = updateEmployeeSchema.parse(await request.json());
    await updateEmployee(id, input, session);
    return ok(null);
});