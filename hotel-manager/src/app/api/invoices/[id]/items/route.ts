import { handle, ok } from "@/lib/apiResponse";
import { addInvoiceItemSchema } from "@/schemas/invoice";
import { requireApiRole } from "@/services/authService";
import { addInvoiceItem } from "@/services/invoiceService";

type Context = { params: Promise<{ id: string }> };

export const POST = handle(async (request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST");
    const { id } = await params;
    const input = addInvoiceItemSchema.parse(await request.json());
    return ok(await addInvoiceItem(id, input, session), 201);
});