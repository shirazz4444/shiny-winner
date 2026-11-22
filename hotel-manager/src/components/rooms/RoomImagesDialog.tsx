"use client";

import { useState, type ChangeEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import type { RoomItem } from "@/components/rooms/types";
import type { ApiResponse } from "@/lib/apiResponse";

const MAX_IMAGES = 6;
const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function RoomImagesDialog({ room }: { room: RoomItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const files = Array.from(input.files ?? []);
    input.value = "";
    if (files.length === 0) return;

    setError(null);
    if (room.images.length + files.length > MAX_IMAGES) {
      setError(`A room can have at most ${MAX_IMAGES} images.`);
      return;
    }
    const bad = files.find(
      (f) => !TYPES.includes(f.type) || f.size === 0 || f.size > MAX_BYTES,
    );
    if (bad) {
      setError(`${bad.name}: use a JPEG, PNG, or WebP image of 2 MB or less.`);
      return;
    }

    setBusy(true);
    for (const file of files) {
      try {
        const form = new FormData();
        form.set("file", file);
        const res = await fetch(
          `/api/rooms/${encodeURIComponent(room.id)}/images`,
          {
            method: "POST",
            body: form,
          },
        );
        const body: ApiResponse<unknown> = await res.json();
        if (!body.success) {
          setError(`${file.name}: ${body.error.message}`);
          break;
        }
      } catch {
        setError("Could not reach the server. Please try again.");
        break;
      }
    }
    setBusy(false);
    router.refresh();
  }

  async function remove(url: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/rooms/${encodeURIComponent(room.id)}/images`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        },
      );
      const body: ApiResponse<unknown> = await res.json();
      if (!body.success) setError(body.error.message);
      else router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    }
    setBusy(false);
  }

  return (
    <>
      <Button
        variant="secondary"
        size="xs"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Images ({room.images.length})
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Room ${room.roomNumber} images`}
      >
        <div className="flex flex-col gap-4">
          {error && <Alert>{error}</Alert>}

          {room.images.length === 0 ? (
            <p className="text-muted-foreground">
              This room has no images yet.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3">
              {room.images.map((url, i) => (
                <li key={url} className="flex flex-col gap-2">
                  <Image
                    src={url}
                    alt={`Room ${room.roomNumber}, photo ${i + 1}`}
                    width={300}
                    height={200}
                    unoptimized
                    className="aspect-3/2 w-full rounded-md object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="xs"
                    disabled={busy}
                    onClick={() => remove(url)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-1">
            <label
              htmlFor={`images-${room.id}`}
              className="text-sm font-medium"
            >
              Add images
            </label>
            <input
              id={`images-${room.id}`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={busy || room.images.length >= MAX_IMAGES}
              onChange={onChange}
              className="text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground disabled:opacity-60"
            />
            <p className="text-xs text-muted-foreground">
              {room.images.length} of {MAX_IMAGES} images. JPEG, PNG, or WebP,
              up to 2 MB each.
            </p>
            {busy && (
              <p role="status" className="text-sm text-muted-foreground">
                Working...
              </p>
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
}
