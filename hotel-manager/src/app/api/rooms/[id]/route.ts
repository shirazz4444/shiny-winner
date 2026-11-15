import { handle, ok } from "@/lib/apiResponse";
import { updateRoomSchema } from "@/schemas/room";
import { requireApiRole } from "@/services/authService";
import { deleteRoom, getRoom, updateRoom } from "@/services/roomService";

type Context = { params: Promise<{ id: string }> };

export const GET = handle(async (_request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING");
    const { id } = await params;
    return ok(await getRoom(id, session));
});

export const PATCH = handle(async (request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER");
    const { id } = await params;
    const input = updateRoomSchema.parse(await request.json());
    await updateRoom(id, input, session);
    return ok(null);
});

export const DELETE = handle(async (_request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER");
    const { id } = await params;
    await deleteRoom(id, session);
    return ok(null);
});