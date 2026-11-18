import { handle, ok } from "@/lib/apiResponse";
import { dashboardChartsSchema } from "@/schemas/dashboard";
import { requireApiRole } from "@/services/authService";
import { getDashboardCharts } from "@/services/dashboardService";

export const GET = handle(async (request) => {
    const session = await requireApiRole("ADMIN", "MANAGER");
    const filters = dashboardChartsSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return ok(await getDashboardCharts(filters, session));
});