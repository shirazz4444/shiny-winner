"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import SelectField from "@/components/ui/fields/SelectField";
import TextareaField from "@/components/ui/fields/TextareaField";
import type {
  RoomOption,
  StaffOption,
  TaskItem,
} from "@/components/housekeeping/types";
import type { ApiResponse } from "@/lib/apiResponse";

type Props = {
  mode: "create" | "edit";
  task?: TaskItem;
  rooms: RoomOption[];
  housekeepers: StaffOption[];
};

export default function TaskFormDialog({
  mode,
  task,
  rooms,
  housekeepers,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const target = mode === "edit" ? task : undefined;
  const canReassign = !target || target.status === "PENDING";
  const assignable = housekeepers.filter(
    (h) => h.isAvailable || h.id === target?.assignedToId,
  );

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const assignedToId = String(form.get("assignedToId") ?? "") || null;
    const notes = String(form.get("notes") ?? "").trim() || null;

    try {
      const res = await fetch(
        target
          ? `/api/housekeeping/tasks/${encodeURIComponent(target.id)}`
          : "/api/housekeeping/tasks",
        {
          method: target ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            target
              ? { notes, ...(canReassign && { assignedToId }) }
              : { roomId: form.get("roomId"), assignedToId, notes },
          ),
        },
      );
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
      {target ? (
        <Button
          variant="secondary"
          size="xs"
          onClick={() => {
            setError(null);
            setFieldErrors({});
            setOpen(true);
          }}
        >
          Edit
        </Button>
      ) : (
        <Button
          onClick={() => {
            setError(null);
            setFieldErrors({});
            setOpen(true);
          }}
        >
          <Plus size={18} aria-hidden="true" />
          New Task
        </Button>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={
          target
            ? `Edit task: room ${target.roomNumber}`
            : "New housekeeping task"
        }
      >
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {error && <Alert>{error}</Alert>}

          {!target && (
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
          )}

          <SelectField
            id="assignedToId"
            name="assignedToId"
            label="Assigned to"
            defaultValue={target?.assignedToId ?? ""}
            disabled={!canReassign}
            hint={
              canReassign
                ? "Only available housekeeping staff are listed."
                : "A task can only be reassigned before it starts."
            }
            error={first("assignedToId")}
          >
            <option value="">Unassigned</option>
            {assignable.map((h) => (
              <option key={h.id} value={h.id}>
                {h.fullName}
              </option>
            ))}
          </SelectField>

          <TextareaField
            id="notes"
            name="notes"
            label="Notes (optional)"
            defaultValue={target?.notes ?? ""}
            error={first("notes")}
          />

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : target ? "Save Changes" : "Create Task"}
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
