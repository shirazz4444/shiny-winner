import { handle, ok } from "@/lib/apiResponse";
import { setReservationStatusSchema } from "@/schemas/reservation";
import { requireApiRole } from "@/services/authService";
import { setReservationStatus } from "@/services/reservationService";

type Context = { params: Promise<{ id: string }> };

export const PATCH = handle(async (request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST");
    const { id } = await params;
    const input = setReservationStatusSchema.parse(await request.json());
    await setReservationStatus(id, input, session);
    return ok(null);
});