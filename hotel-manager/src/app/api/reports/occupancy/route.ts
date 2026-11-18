import { handle } from "@/lib/apiResponse";
import { reportResponse } from "@/lib/csv";
import { reportSchema } from "@/schemas/report";
import { requireApiRole } from "@/services/authService";
import { getOccupancyReport } from "@/services/reportService";

export const GET = handle(async (request) => {
    const session = await requireApiRole("ADMIN", "MANAGER");
    const filters = reportSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return reportResponse(await getOccupancyReport(filters, session), filters.format, "occupancy-report");
});