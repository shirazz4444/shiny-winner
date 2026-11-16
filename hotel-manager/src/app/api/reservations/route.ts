import { handle, ok } from "@/lib/apiResponse";
import { createReservationSchema, listReservationsSchema } from "@/schemas/reservation";
import { requireApiRole } from "@/services/authService";
import { createReservation, listReservations } from "@/services/reservationService";

export const GET = handle(async (request) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST");
    const filters = listReservationsSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return ok(await listReservations(filters, session));
});

export const POST = handle(async (request) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST");
    const input = createReservationSchema.parse(await request.json());
    return ok(await createReservation(input, session), 201);
});