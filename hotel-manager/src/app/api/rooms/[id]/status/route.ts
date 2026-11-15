import { BadRequestError, handle, ok } from "@/lib/apiResponse";
import { removeRoomImageSchema } from "@/schemas/room";
import { requireApiRole } from "@/services/authService";
import { addRoomImage, removeRoomImage } from "@/services/roomService";

type Context = { params: Promise<{ id: string }> };

export const POST = handle(async (request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER");
    const { id } = await params;

    const form = await request.formData().catch(() => {
        throw new BadRequestError("Request must be multipart form data");
    });
    const file = form.get("file");
    if (!(file instanceof File)) throw new BadRequestError('Attach an image in the "file" field');

    return ok(await addRoomImage(id, file, session), 201);
});

export const DELETE = handle(async (request, { params }: Context) => {
    const session = await requireApiRole("ADMIN", "MANAGER");
    const { id } = await params;
    const { url } = removeRoomImageSchema.parse(await request.json());
    return ok(await removeRoomImage(id, url, session));
});