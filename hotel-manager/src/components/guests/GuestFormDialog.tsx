"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import TextField from "@/components/ui/fields/TextField";
import type { ApiResponse } from "@/lib/apiResponse";

export type GuestDetails = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
};

type Props = {
  mode: "create" | "edit";
  guest?: GuestDetails;
};

export default function GuestFormDialog({ mode, guest }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const target = mode === "edit" ? guest : undefined;

  function openDialog() {
    setError(null);
    setFieldErrors({});
    setOpen(true);
  }

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch(
        target ? `/api/guests/${encodeURIComponent(target.id)}` : "/api/guests",
        {
          method: target ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: form.get("fullName"),
            email: form.get("email"),
            phone: form.get("phone"),
            address: form.get("address"),
          }),
        },
      );
      const body: ApiResponse<{ id: string } | null> = await res.json();

      if (!body.success) {
        setError(body.error.message);
        setFieldErrors(body.error.details ?? {});
      } else if (target) {
        setOpen(false);
        router.refresh();
      } else {
        const created = body.data as { id: string };
        router.push(`/guests/${created.id}`);
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
        <Button variant="secondary" onClick={openDialog}>
          Edit Guest Info
        </Button>
      ) : (
        <Button onClick={openDialog}>
          <Plus size={18} aria-hidden="true" />
          Add Guest
        </Button>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={target ? "Edit guest" : "Add guest"}
      >
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {error && <Alert>{error}</Alert>}

          <TextField
            id="fullName"
            name="fullName"
            label="Full name"
            autoComplete="off"
            defaultValue={target?.fullName}
            error={first("fullName")}
          />
          <TextField
            id="email"
            name="email"
            type="email"
            label="Email"
            autoComplete="off"
            defaultValue={target?.email}
            error={first("email")}
          />
          <TextField
            id="phone"
            name="phone"
            type="tel"
            label="Phone"
            autoComplete="off"
            defaultValue={target?.phone}
            error={first("phone")}
          />
          <TextField
            id="address"
            name="address"
            label="Address"
            autoComplete="off"
            defaultValue={target?.address}
            error={first("address")}
          />

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading
                ? target
                  ? "Saving..."
                  : "Creating..."
                : target
                  ? "Save changes"
                  : "Create guest"}
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
