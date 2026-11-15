import "server-only";
import { randomUUID } from "node:crypto";
import { StorageClient } from "@supabase/storage-js";

const BUCKET = "room-images";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_IMAGES_PER_ROOM = 6;
export const IMAGE_TYPES: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};

function bucket() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");

    const client = new StorageClient(`${url.replace(/\/$/, "")}/storage/v1`, {
        apikey: key,
        Authorization: `Bearer ${key}`,
    });
    return client.from(BUCKET);
}

export async function uploadRoomImage(roomId: string, file: File): Promise<string> {
    const storage = bucket();
    const path = `${roomId}/${randomUUID()}.${IMAGE_TYPES[file.type]}`;

    const { error } = await storage.upload(path, file, { contentType: file.type });
    if (error) throw new Error(`Image upload failed: ${error.message}`);

    return storage.getPublicUrl(path).data.publicUrl;
}

export async function deleteRoomImages(urls: readonly string[]): Promise<void> {
    const marker = `/object/public/${BUCKET}/`;
    const paths = urls.flatMap((u) => {
        const i = u.indexOf(marker);
        return i === -1 ? [] : [decodeURIComponent(u.slice(i + marker.length))];
    });
    if (paths.length === 0) return;

    const { error } = await bucket().remove(paths);
    if (error) console.error(error);
}