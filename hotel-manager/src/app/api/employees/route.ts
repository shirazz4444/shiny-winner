import { handle, ok } from "@/lib/apiResponse";
import { createEmployeeSchema, listEmployeesSchema } from "@/schemas/employee";
import { requireApiRole } from "@/services/authService";
import { createEmployee, listEmployees } from "@/services/employeeService";

export const GET = handle(async (request) => {
    const session = await requireApiRole("ADMIN", "MANAGER");
    const filters = listEmployeesSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return ok(await listEmployees(filters, session));
});

export const POST = handle(async (request) => {
    const session = await requireApiRole("ADMIN", "MANAGER");
    const input = createEmployeeSchema.parse(await request.json());
    return ok(await createEmployee(input, session), 201);
});