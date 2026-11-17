import { handle, ok } from "@/lib/apiResponse";
import { requireApiRole } from "@/services/authService";
import { getInvoice } from "@/services/invoiceService";

type Context = { params: Promise<{ id: string }> };

export const GET = handle(async (_request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST");
    const { id } = await params;
    return ok(await getInvoice(id, session));
});