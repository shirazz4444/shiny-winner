import { handle, ok } from "@/lib/apiResponse";
import { availableRoomsSchema } from "@/schemas/reservation";
import { requireApiRole } from "@/services/authService";
import { getAvailableRooms } from "@/services/reservationService";

export const GET = handle(async (request) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST");
    const filters = availableRoomsSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return ok(await getAvailableRooms(filters, session));
});