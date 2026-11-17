import { handle, ok } from "@/lib/apiResponse";
import { setDiscountSchema } from "@/schemas/invoice";
import { requireApiRole } from "@/services/authService";
import { setInvoiceDiscount } from "@/services/invoiceService";

type Context = { params: Promise<{ id: string }> };

export const PATCH = handle(async (request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST");
    const { id } = await params;
    const input = setDiscountSchema.parse(await request.json());
    return ok(await setInvoiceDiscount(id, input, session));
});