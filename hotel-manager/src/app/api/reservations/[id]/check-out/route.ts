import { handle, ok } from "@/lib/apiResponse";
import { checkOutSchema } from "@/schemas/invoice";
import { requireApiRole } from "@/services/authService";
import { checkOutReservation } from "@/services/invoiceService";

type Context = { params: Promise<{ id: string }> };

export const POST = handle(async (request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST");
    const { id } = await params;
    const input = checkOutSchema.parse(await request.json());
    return ok(await checkOutReservation(id, input, session));
});