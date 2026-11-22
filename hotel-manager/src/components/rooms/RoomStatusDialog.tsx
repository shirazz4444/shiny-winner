"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import SelectField from "@/components/ui/fields/SelectField";
import type { RoomItem } from "@/components/rooms/types";
import type { ApiResponse } from "@/lib/apiResponse";

const OPTIONS = [
  { value: "AVAILABLE", label: "Available" },
  { value: "CLEANING", label: "Cleaning" },
  { value: "MAINTENANCE", label: "Maintenance" },
];

export default function RoomStatusDialog({ room }: { room: RoomItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const status = String(
      new FormData(event.currentTarget).get("status") ?? "",
    );
    try {
      const res = await fetch(
        `/api/rooms/${encodeURIComponent(room.id)}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
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
        variant="secondary"
        size="xs"
        disabled={room.status === "OCCUPIED"}
        title={
          room.status === "OCCUPIED"
            ? "An occupied room's status changes at check-out"
            : undefined
        }
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Status
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Room ${room.roomNumber} status`}
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {error && <Alert>{error}</Alert>}
          <SelectField
            id="status"
            name="status"
            label="Status"
            defaultValue={
              OPTIONS.some((o) => o.value === room.status)
                ? room.status
                : "AVAILABLE"
            }
            hint="Occupied and Reserved are set automatically by check-in and reservations."
          >
            {OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>
          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save status"}
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
