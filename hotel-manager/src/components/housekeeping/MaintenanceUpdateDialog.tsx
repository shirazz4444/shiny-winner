"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import SelectField from "@/components/ui/fields/SelectField";
import TextareaField from "@/components/ui/fields/TextareaField";
import type { MaintenanceItem } from "@/components/housekeeping/types";
import type { ApiResponse } from "@/lib/apiResponse";

const STATUSES = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
];

export default function MaintenanceUpdateDialog({
  request,
}: {
  request: MaintenanceItem;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const startIndex = STATUSES.findIndex((s) => s.value === request.status);
  const options = STATUSES.slice(startIndex);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch(
        `/api/maintenance/${encodeURIComponent(request.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: form.get("status"),
            description: form.get("description"),
          }),
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
      <Button
        variant="secondary"
        size="xs"
        onClick={() => {
          setError(null);
          setFieldErrors({});
          setOpen(true);
        }}
      >
        Update
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Room ${request.roomNumber}: update issue`}
      >
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {error && <Alert>{error}</Alert>}
          <SelectField
            id="status"
            name="status"
            label="Status"
            defaultValue={request.status}
            hint="A request can only move forward. Resolving the last open issue frees the room."
            error={first("status")}
          >
            {options.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </SelectField>
          <TextareaField
            id="description"
            name="description"
            label="Description"
            defaultValue={request.description}
            error={first("description")}
          />
          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
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
