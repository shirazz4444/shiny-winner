import { handle, ok } from "@/lib/apiResponse";
import { calendarSchema } from "@/schemas/calendar";
import { requireApiRole } from "@/services/authService";
import { getCalendar } from "@/services/calendarService";

export const GET = handle(async (request) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST");
    const filters = calendarSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return ok(await getCalendar(filters, session));
});