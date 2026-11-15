import { handle, ok } from "@/lib/apiResponse";
import { setRoomStatusSchema } from "@/schemas/room";
import { requireApiRole } from "@/services/authService";
import { setRoomStatus } from "@/services/roomService";

type Context = { params: Promise<{ id: string }> };

export const PATCH = handle(async (request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER");
    const { id } = await params;
    const input = setRoomStatusSchema.parse(await request.json());
    await setRoomStatus(id, input, session);
    return ok(null);
});