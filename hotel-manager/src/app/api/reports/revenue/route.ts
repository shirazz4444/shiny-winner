import { handle } from "@/lib/apiResponse";
import { reportResponse } from "@/lib/csv";
import { revenueReportSchema } from "@/schemas/report";
import { requireApiRole } from "@/services/authService";
import { getRevenueReport } from "@/services/reportService";

export const GET = handle(async (request) => {
    const session = await requireApiRole("ADMIN", "MANAGER");
    const filters = revenueReportSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return reportResponse(await getRevenueReport(filters, session), filters.format, "revenue-report");
});