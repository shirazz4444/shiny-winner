import { handle, ok } from "@/lib/apiResponse";
import { checkInSchema } from "@/schemas/reservation";
import { requireApiRole } from "@/services/authService";
import { checkInReservation } from "@/services/reservationService";

type Context = { params: Promise<{ id: string }> };

export const POST = handle(async (request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST");
    const { id } = await params;
    const input = checkInSchema.parse(await request.json().catch(() => ({})));
    return ok(await checkInReservation(id, input, session));
});