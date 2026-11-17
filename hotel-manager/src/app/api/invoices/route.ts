import { handle, ok } from "@/lib/apiResponse";
import { listInvoicesSchema } from "@/schemas/invoice";
import { requireApiRole } from "@/services/authService";
import { listInvoices } from "@/services/invoiceService";

export const GET = handle(async (request) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST");
    const filters = listInvoicesSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return ok(await listInvoices(filters, session));
});