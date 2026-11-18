import { handle } from "@/lib/apiResponse";
import { reportResponse } from "@/lib/csv";
import { reportSchema } from "@/schemas/report";
import { requireApiRole } from "@/services/authService";
import { getGuestReport } from "@/services/reportService";

export const GET = handle(async (request) => {
    const session = await requireApiRole("ADMIN", "MANAGER");
    const filters = reportSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return reportResponse(await getGuestReport(filters, session), filters.format, "guests-report");
});