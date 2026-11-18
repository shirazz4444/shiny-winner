import { z } from "zod";

const range = {
    startDate: z.iso.date().optional(),
    endDate: z.iso.date().optional(),
    format: z.enum(["json", "csv"]).default("json"),
};

export const reportSchema = z.object(range);

export type ReportFilters = z.infer<typeof reportSchema>;

export const revenueReportSchema = z.object({
    ...range,
    period: z.enum(["daily", "weekly", "monthly"]).default("daily"),
});

export type RevenueReportFilters = z.infer<typeof revenueReportSchema>;