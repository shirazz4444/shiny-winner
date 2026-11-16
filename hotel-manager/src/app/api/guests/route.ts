import { handle, ok } from "@/lib/apiResponse";
import { createGuestSchema, listGuestsSchema } from "@/schemas/guest";
import { requireApiRole } from "@/services/authService";
import { createGuest, listGuests } from "@/services/guestService";

export const GET = handle(async (request) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST");
    const filters = listGuestsSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return ok(await listGuests(filters, session));
});

export const POST = handle(async (request) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST");
    const input = createGuestSchema.parse(await request.json());
    return ok(await createGuest(input, session), 201);
});