"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import type { RoomItem } from "@/components/rooms/types";
import type { ApiResponse } from "@/lib/apiResponse";

export default function RoomDeleteDialog({ room }: { room: RoomItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(room.id)}`, {
        method: "DELETE",
      });
      const body: ApiResponse<unknown> = await res.json();
      if (!body.success) setError(body.error.message);
      else {
        setOpen(false);
        router.refresh();
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    }
    setLoading(false);
  }

  return (
    <>
      <Button
        variant="destructive"
        size="xs"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Delete
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Delete room ${room.roomNumber}`}
      >
        <div className="flex flex-col gap-4">
          {error && <Alert>{error}</Alert>}
          <p>
            Delete room {room.roomNumber}? Its images are removed too. A room
            with reservations, housekeeping, or maintenance history can&apos;t
            be deleted.
          </p>
          <div className="flex gap-3">
            <Button variant="destructive" disabled={loading} onClick={onDelete}>
              {loading ? "Deleting..." : "Yes, delete"}
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
