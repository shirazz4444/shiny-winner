import { handle, ok } from "@/lib/apiResponse";
import { requireApiRole } from "@/services/authService";
import { resetEmployeePassword } from "@/services/employeeService";

type Context = { params: Promise<{ id: string }> };

export const POST = handle(async (_request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER");
    const { id } = await params;
    return ok(await resetEmployeePassword(id, session));
});