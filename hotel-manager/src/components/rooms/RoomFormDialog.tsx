"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import SelectField from "@/components/ui/fields/SelectField";
import TextField from "@/components/ui/fields/TextField";
import type { CategoryOption, RoomItem } from "@/components/rooms/types";
import type { ApiResponse } from "@/lib/apiResponse";
import centsToUSD from "@/lib/centsToUSD";

type Props = {
  mode: "create" | "edit";
  room?: RoomItem;
  categories: CategoryOption[];
};

export default function RoomFormDialog({ mode, room, categories }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const target = mode === "edit" ? room : undefined;
  const options = categories.filter(
    (c) => c.isActive || c.id === target?.categoryId,
  );

  function openDialog() {
    setError(null);
    setFieldErrors({});
    setOpen(true);
  }

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const priceText = String(form.get("price") ?? "").trim();
    const occupancyText = String(form.get("maxOccupancy") ?? "").trim();

    const errors: Record<string, string[]> = {};
    let price: number | undefined;
    let maxOccupancy: number | undefined;
    if (priceText !== "") {
      const n = Number(priceText);
      if (!Number.isFinite(n) || n < 0) errors.price = ["Enter a valid price."];
      else price = Math.round(n * 100);
    }
    if (occupancyText !== "") {
      const n = Number(occupancyText);
      if (!Number.isInteger(n) || n < 1)
        errors.maxOccupancy = ["Enter a whole number of at least 1."];
      else maxOccupancy = n;
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        target ? `/api/rooms/${encodeURIComponent(target.id)}` : "/api/rooms",
        {
          method: target ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomNumber: form.get("roomNumber"),
            categoryId: form.get("categoryId"),
            ...(price !== undefined && { price }),
            ...(maxOccupancy !== undefined && { maxOccupancy }),
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
      {target ? (
        <Button variant="secondary" size="xs" onClick={openDialog}>
          Edit
        </Button>
      ) : (
        <Button onClick={openDialog}>
          <Plus size={18} aria-hidden="true" />
          Add room
        </Button>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={target ? `Edit room ${target.roomNumber}` : "Add room"}
      >
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {error && <Alert>{error}</Alert>}

          <TextField
            id="roomNumber"
            name="roomNumber"
            label="Room number"
            autoComplete="off"
            defaultValue={target?.roomNumber}
            error={first("roomNumber")}
          />
          <SelectField
            id="categoryId"
            name="categoryId"
            label="Category"
            defaultValue={target?.categoryId ?? options[0]?.id}
            error={first("categoryId")}
          >
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({centsToUSD(c.basePrice)}, up to {c.maxOccupancy})
              </option>
            ))}
          </SelectField>
          <TextField
            id="price"
            name="price"
            type="number"
            step="0.01"
            min={0}
            label="Nightly price (USD)"
            hint={
              target ? undefined : "Leave empty to use the category's default."
            }
            defaultValue={target ? (target.price / 100).toFixed(2) : undefined}
            error={first("price")}
          />
          <TextField
            id="maxOccupancy"
            name="maxOccupancy"
            type="number"
            min={1}
            label="Maximum occupancy"
            hint={
              target ? undefined : "Leave empty to use the category's default."
            }
            defaultValue={target?.maxOccupancy}
            error={first("maxOccupancy")}
          />

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : target ? "Save changes" : "Create room"}
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
