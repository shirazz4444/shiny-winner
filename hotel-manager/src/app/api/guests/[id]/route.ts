import { handle, ok } from "@/lib/apiResponse";
import { updateGuestSchema } from "@/schemas/guest";
import { requireApiRole } from "@/services/authService";
import { getGuest, updateGuest } from "@/services/guestService";

type Context = { params: Promise<{ id: string }> };

export const GET = handle(async (_request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST");
    const { id } = await params;
    return ok(await getGuest(id, session));
});

export const PATCH = handle(async (request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST");
    const { id } = await params;
    const input = updateGuestSchema.parse(await request.json());
    await updateGuest(id, input, session);
    return ok(null);
});