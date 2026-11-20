"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import SelectField from "@/components/ui/fields/SelectField";
import TextField from "@/components/ui/fields/TextField";
import CredentialsPanel from "@/components/staff/CredentialsPanel";
import type { ApiResponse } from "@/lib/apiResponse";
import { ROLES, ROLE_LABELS } from "@/lib/roleLabels";
import type { Role } from "@/types/employee";

export type StaffMember = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  isActive: boolean;
  isAvailable: boolean;
};

type Created = { id: string; email: string; temporaryPassword: string };

type Props = {
  mode: "create" | "edit";
  employee?: StaffMember;
  viewerRole: Role;
  viewerId: string;
};

export default function EmployeeFormDialog({
  mode,
  employee,
  viewerRole,
  viewerId,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [created, setCreated] = useState<Created | null>(null);

  const target = mode === "edit" ? employee : undefined;
  const isSelf = !!target && target.id === viewerId;
  const roles = ROLES.filter((r) => r !== "ADMIN" || viewerRole === "ADMIN");

  function openDialog() {
    setError(null);
    setFieldErrors({});
    setCreated(null);
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    if (created) router.refresh();
  }

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      fullName: form.get("fullName"),
      email: form.get("email"),
      phone: form.get("phone"),
    };
    if (!isSelf) payload.role = form.get("role");
    if (target) payload.isAvailable = form.get("isAvailable") === "on";

    try {
      const res = await fetch(
        target
          ? `/api/employees/${encodeURIComponent(target.id)}`
          : "/api/employees",
        {
          method: target ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body: ApiResponse<Created | null> = await res.json();

      if (!body.success) {
        setError(body.error.message);
        setFieldErrors(body.error.details ?? {});
      } else if (target) {
        setOpen(false);
        router.refresh();
      } else {
        setCreated(body.data as Created);
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
          Add Employee
        </Button>
      )}

      <Dialog
        open={open}
        onClose={handleClose}
        title={
          created
            ? "Employee account created"
            : target
              ? "Edit Employee"
              : "Add Employee"
        }
      >
        {created ? (
          <div className="flex flex-col gap-4">
            <CredentialsPanel
              email={created.email}
              password={created.temporaryPassword}
            />
            <Button onClick={handleClose} className="self-start">
              Done
            </Button>
          </div>
        ) : (
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
              label={target ? "Email (also their login)" : "Email"}
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
            <SelectField
              id="role"
              name="role"
              label="Role"
              defaultValue={target?.role ?? "HOUSEKEEPING"}
              disabled={isSelf}
              hint={isSelf ? "You can't change your own role." : undefined}
              error={first("role")}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </SelectField>

            {target && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isAvailable"
                  defaultChecked={target.isAvailable}
                  className="accent-primary"
                />
                Available for task assignments
              </label>
            )}

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading
                  ? target
                    ? "Saving..."
                    : "Creating..."
                  : target
                    ? "Save changes"
                    : "Create employee"}
              </Button>
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
