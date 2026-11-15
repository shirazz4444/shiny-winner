import { handle, ok } from "@/lib/apiResponse";
import { createRoomSchema, listRoomsSchema } from "@/schemas/room";
import { requireApiRole } from "@/services/authService";
import { createRoom, listRooms } from "@/services/roomService";

export const GET = handle(async (request) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING");
    const filters = listRoomsSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return ok(await listRooms(filters, session));
});

export const POST = handle(async (request) => {
    const session = await requireApiRole("ADMIN", "MANAGER");
    const input = createRoomSchema.parse(await request.json());
    return ok(await createRoom(input, session), 201);
});