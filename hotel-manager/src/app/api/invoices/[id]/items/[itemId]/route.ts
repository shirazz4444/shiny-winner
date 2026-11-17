import { handle, ok } from "@/lib/apiResponse";
import { updateInvoiceItemSchema } from "@/schemas/invoice";
import { requireApiRole } from "@/services/authService";
import { removeInvoiceItem, updateInvoiceItem } from "@/services/invoiceService";

type Context = { params: Promise<{ id: string; itemId: string }> };

export const PATCH = handle(async (request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST");
    const { id, itemId } = await params;
    const input = updateInvoiceItemSchema.parse(await request.json());
    return ok(await updateInvoiceItem(id, itemId, input, session));
});

export const DELETE = handle(async (_request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST");
    const { id, itemId } = await params;
    return ok(await removeInvoiceItem(id, itemId, session));
});