"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Alert from "@/components/ui/Alert";
import Button, { buttonClass } from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import type { ApiResponse } from "@/lib/apiResponse";

type Props = {
  id: string;
  status: string;
  hasRoom: boolean;
};

const CONFIRM_TEXT = {
  CANCELLED:
    "Cancel this reservation? Its room is released for these dates. You can reopen it later if the room is still free.",
  NO_SHOW:
    "Mark this guest as a no-show? Its room is released for these dates. You can reopen it later if the room is still free.",
};

export default function ReservationStatusActions({
  id,
  status,
  hasRoom,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<"CANCELLED" | "NO_SHOW" | null>(
    null,
  );

  async function change(next: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/reservations/${encodeURIComponent(id)}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        },
      );
      const body: ApiResponse<unknown> = await res.json();
      if (!body.success) setError(body.error.message);
      else {
        setConfirming(null);
        router.refresh();
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    }
    setBusy(false);
  }

  if (status === "CHECKED_OUT") return null;

  if (status === "CHECKED_IN") {
    return (
      <Link
        href="/check-in-out?mode=check-out"
        className={buttonClass("secondary")}
      >
        Go to check-out
      </Link>
    );
  }

  const open = status === "PENDING" || status === "CONFIRMED";

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        {status === "PENDING" && (
          <Button
            disabled={busy || !hasRoom}
            title={hasRoom ? undefined : "Assign a room before confirming"}
            onClick={() => change("CONFIRMED")}
          >
            Confirm
          </Button>
        )}
        {open && (
          <>
            <Link
              href="/check-in-out?mode=check-in"
              className={buttonClass("secondary")}
            >
              Go to check-in
            </Link>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setConfirming("NO_SHOW")}
            >
              Mark no-show
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => setConfirming("CANCELLED")}
            >
              Cancel reservation
            </Button>
          </>
        )}
        {!open && (
          <Button disabled={busy} onClick={() => change("PENDING")}>
            Reopen as pending
          </Button>
        )}
      </div>
      {error && <Alert>{error}</Alert>}

      <Dialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title={
          confirming === "CANCELLED" ? "Cancel reservation" : "Mark as no-show"
        }
      >
        {confirming && (
          <div className="flex flex-col gap-4">
            {error && <Alert>{error}</Alert>}
            <p>{CONFIRM_TEXT[confirming]}</p>
            <div className="flex gap-3">
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() => change(confirming)}
              >
                {busy ? "Saving..." : "Yes, continue"}
              </Button>
              <Button variant="secondary" onClick={() => setConfirming(null)}>
                Go back
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
