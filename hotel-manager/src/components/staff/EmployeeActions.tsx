"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import CredentialsPanel from "@/components/staff/CredentialsPanel";
import EmployeeFormDialog, {
  type StaffMember,
} from "@/components/staff/EmployeeFormDialog";
import type { ApiResponse } from "@/lib/apiResponse";
import type { Role } from "@/types/employee";

type Props = {
  employee: StaffMember;
  viewerRole: Role;
  viewerId: string;
};

export default function EmployeeActions({
  employee,
  viewerRole,
  viewerId,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);

  const manageable = employee.role !== "ADMIN" || viewerRole === "ADMIN";
  const isSelf = employee.id === viewerId;

  if (!manageable) {
    return <span className="text-sm text-muted-foreground">No actions</span>;
  }

  async function toggleActive() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/employees/${encodeURIComponent(employee.id)}/active`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: !employee.isActive }),
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

  function openReset() {
    setResetError(null);
    setPassword(null);
    setResetOpen(true);
  }

  async function resetPassword() {
    setBusy(true);
    setResetError(null);
    try {
      const res = await fetch(
        `/api/employees/${encodeURIComponent(employee.id)}/reset-password`,
        { method: "POST" },
      );
      const body: ApiResponse<{ temporaryPassword: string }> = await res.json();
      if (!body.success) setResetError(body.error.message);
      else setPassword(body.data.temporaryPassword);
    } catch {
      setResetError("Could not reach the server. Please try again.");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col items-stretch gap-1">
      <EmployeeFormDialog
        mode="edit"
        employee={employee}
        viewerRole={viewerRole}
        viewerId={viewerId}
      />
      {!isSelf && (
        <Button
          variant={employee.isActive ? "destructive" : "constructive"}
          size="xs"
          disabled={busy}
          onClick={toggleActive}
        >
          {busy ? "Saving..." : employee.isActive ? "Deactivate" : "Activate"}
        </Button>
      )}
      <Button variant="secondary" size="xs" onClick={openReset}>
        Reset Password
      </Button>
      {error && (
        <p
          role="alert"
          className="max-w-48 whitespace-normal text-xs text-destructive"
        >
          {error}
        </p>
      )}

      <Dialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title={password ? "Password reset" : "Reset password"}
      >
        {password ? (
          <div className="flex flex-col gap-4">
            <CredentialsPanel email={employee.email} password={password} />
            <Button onClick={() => setResetOpen(false)} className="self-start">
              Done
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {resetError && <Alert>{resetError}</Alert>}
            <p>
              Reset the password for {employee.fullName}? A new temporary
              password will be generated, and the current one stops working.
            </p>
            <div className="flex gap-3">
              <Button disabled={busy} onClick={resetPassword}>
                {busy ? "Resetting..." : "Reset password"}
              </Button>
              <Button variant="secondary" onClick={() => setResetOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
