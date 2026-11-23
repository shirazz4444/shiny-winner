"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import SelectField from "@/components/ui/fields/SelectField";
import TextareaField from "@/components/ui/fields/TextareaField";
import type { RoomOption } from "@/components/housekeeping/types";
import type { ApiResponse } from "@/lib/apiResponse";

export default function MaintenanceReportDialog({
  rooms,
}: {
  rooms: RoomOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: form.get("roomId"),
          description: form.get("description"),
        }),
      });
      const body: ApiResponse<unknown> = await res.json();

      if (!body.success) {
        setError(body.error.message);
        setFieldErrors(body.error.details ?? {});
      } else {
        setOpen(false);
        router.refresh();
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    }
    setLoading(false);
  }

  const first = (field: string) => fieldErrors[field]?.[0];

  return (
    <>
      <Button
        onClick={() => {
          setError(null);
          setFieldErrors({});
          setOpen(true);
        }}
      >
        <Plus size={18} aria-hidden="true" />
        Report an issue
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Report a maintenance issue"
      >
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {error && <Alert>{error}</Alert>}
          <SelectField
            id="roomId"
            name="roomId"
            label="Room"
            error={first("roomId")}
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                Room {r.roomNumber}
              </option>
            ))}
          </SelectField>
          <TextareaField
            id="description"
            name="description"
            label="What is wrong?"
            hint="The room is put into Maintenance until the issue is resolved, unless a guest is in it."
            error={first("description")}
          />
          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "Reporting..." : "Report issue"}
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
