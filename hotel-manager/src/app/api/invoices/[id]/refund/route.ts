import { handle, ok } from "@/lib/apiResponse";
import { refundSchema } from "@/schemas/invoice";
import { requireApiRole } from "@/services/authService";
import { refundInvoice } from "@/services/invoiceService";

type Context = { params: Promise<{ id: string }> };

export const POST = handle(async (request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER");
    const { id } = await params;
    const input = refundSchema.parse(await request.json().catch(() => ({})));
    return ok(await refundInvoice(id, input, session));
});