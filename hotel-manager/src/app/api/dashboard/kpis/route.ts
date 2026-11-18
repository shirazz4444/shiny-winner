import { handle, ok } from "@/lib/apiResponse";
import { requireApiRole } from "@/services/authService";
import { getDashboardKpis } from "@/services/dashboardService";

export const GET = handle(async () => {
    const session = await requireApiRole("ADMIN", "MANAGER");
    return ok(await getDashboardKpis(session));
});