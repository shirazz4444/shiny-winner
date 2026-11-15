import { handle, ok } from "@/lib/apiResponse";
import { setActiveSchema } from "@/schemas/employee";
import { requireApiRole } from "@/services/authService";
import { setEmployeeActive } from "@/services/employeeService";

type Context = { params: Promise<{ id: string }> };

export const PATCH = handle(async (request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER");
    const { id } = await params;
    const { active } = setActiveSchema.parse(await request.json());
    await setEmployeeActive(id, active, session);
    return ok(null);
});