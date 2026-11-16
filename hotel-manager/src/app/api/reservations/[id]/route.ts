import { handle, ok } from "@/lib/apiResponse";
import { updateReservationSchema } from "@/schemas/reservation";
import { requireApiRole } from "@/services/authService";
import { getReservation, updateReservation } from "@/services/reservationService";

type Context = { params: Promise<{ id: string }> };

export const GET = handle(async (_request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST");
    const { id } = await params;
    return ok(await getReservation(id, session));
});

export const PATCH = handle(async (request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST");
    const { id } = await params;
    const input = updateReservationSchema.parse(await request.json());
    await updateReservation(id, input, session);
    return ok(null);
});