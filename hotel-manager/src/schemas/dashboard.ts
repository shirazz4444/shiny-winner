import { z } from "zod";

export const dashboardChartsSchema = z.object({
    days: z.coerce.number().int().min(7).max(90).default(30),
    months: z.coerce.number().int().min(1).max(12).default(6),
});

export type DashboardChartsFilters = z.infer<typeof dashboardChartsSchema>;