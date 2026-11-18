import { z } from "zod";

export const calendarSchema = z.object({
    view: z.enum(["daily", "weekly", "monthly"]),
    date: z.iso.date().optional(),
    status: z.enum(["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"]).optional(),
});

export type CalendarFilters = z.infer<typeof calendarSchema>;