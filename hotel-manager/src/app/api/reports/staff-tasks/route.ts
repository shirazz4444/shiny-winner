import { handle } from "@/lib/apiResponse";
import { reportResponse } from "@/lib/csv";
import { reportSchema } from "@/schemas/report";
import { requireApiRole } from "@/services/authService";
import { getStaffTaskReport } from "@/services/reportService";

export const GET = handle(async (request) => {
    const session = await requireApiRole("ADMIN", "MANAGER");
    const filters = reportSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return reportResponse(await getStaffTaskReport(filters, session), filters.format, "staff-tasks-report");
});