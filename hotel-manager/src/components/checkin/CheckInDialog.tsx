"use client";

import { useState, type SubmitEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Alert from "@/components/ui/Alert";
import Button, { buttonClass } from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import SelectField from "@/components/ui/fields/SelectField";
import type {
  AvailableRoom,
  ReservationDetail,
  ReservationRow,
} from "@/components/checkin/types";
import { useApiData } from "@/hooks/useApiData";
import type { ApiResponse } from "@/lib/apiResponse";
import { formatDate } from "@/lib/format";

const statusLabel = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

type BodyProps = {
  reservation: ReservationRow;
  onCompleted: () => void;
  onClose: () => void;
};

function CheckInBody({ reservation, onCompleted, onClose }: BodyProps) {
  const detail = useApiData<ReservationDetail>(
    `/api/reservations/${encodeURIComponent(reservation.id)}`,
  );
  const query = new URLSearchParams({
    checkIn: reservation.checkInDate,
    checkOut: reservation.checkOutDate,
    adults: String(reservation.adults),
    children: String(reservation.children),
    excludeReservationId: reservation.id,
  });
  const rooms = useApiData<{ items: AvailableRoom[] }>(
    `/api/reservations/available-rooms?${query}`,
  );

  const [roomId, setRoomId] = useState(reservation.roomId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    roomNumber: string;
    invoiceId: string;
    at: Date;
  } | null>(null);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/reservations/${encodeURIComponent(reservation.id)}/check-in`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId: roomId || undefined }),
        },
      );
      const body: ApiResponse<{ roomId: string; invoiceId: string }> =
        await res.json();

      if (!body.success) {
        setError(body.error.details?.roomId?.[0] ?? body.error.message);
      } else {
        const room = rooms.data?.items.find((r) => r.id === body.data.roomId);
        setResult({
          roomNumber: room?.roomNumber ?? reservation.roomNumber ?? "",
          invoiceId: body.data.invoiceId,
          at: new Date(),
        });
        onCompleted();
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    }
    setLoading(false);
  }

  if (result) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="info">
          {reservation.guestName} checked in to room {result.roomNumber} on{" "}
          {result.at.toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
          . The room is now occupied and a draft invoice was opened.
        </Alert>
        <div className="flex gap-3">
          <Link
            href={`/billing/${result.invoiceId}`}
            className={buttonClass("secondary")}
          >
            View invoice
          </Link>
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    );
  }

  if (detail.loading || rooms.loading) {
    return (
      <p role="status" className="text-muted-foreground">
        Loading reservation...
      </p>
    );
  }

  if (detail.error || rooms.error || !detail.data || !rooms.data) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert>
          {detail.error ?? rooms.error ?? "Could not load the reservation."}
        </Alert>
        <Button
          variant="secondary"
          onClick={() => {
            detail.retry();
            rooms.retry();
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  const { guest } = detail.data;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {error && <Alert>{error}</Alert>}

      <div>
        <h3 className="mb-2 font-medium">Verify guest details</h3>
        <dl className="grid gap-2 sm:grid-cols-[7rem_1fr]">
          <dt className="text-muted-foreground">Name</dt>
          <dd>{guest.fullName}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="break-all">{guest.email}</dd>
          <dt className="text-muted-foreground">Phone</dt>
          <dd>{guest.phone}</dd>
          <dt className="text-muted-foreground">Address</dt>
          <dd>{guest.address}</dd>
          <dt className="text-muted-foreground">Stay</dt>
          <dd>
            {formatDate(reservation.checkInDate)} to{" "}
            {formatDate(reservation.checkOutDate)} ({reservation.nights}{" "}
            {reservation.nights === 1 ? "night" : "nights"})
          </dd>
          <dt className="text-muted-foreground">Party</dt>
          <dd>
            {reservation.adults} {reservation.adults === 1 ? "adult" : "adults"}
            {reservation.children > 0 &&
              `, ${reservation.children} ${reservation.children === 1 ? "child" : "children"}`}
          </dd>
        </dl>
      </div>

      <SelectField
        id="roomId"
        label="Room"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        hint="Only available or reserved rooms can be checked into. Rooms being cleaned or repaired are greyed out."
      >
        <option value="">Select a room</option>
        {rooms.data.items.map((r) => (
          <option
            key={r.id}
            value={r.id}
            disabled={r.status !== "AVAILABLE" && r.status !== "RESERVED"}
          >
            Room {r.roomNumber}: {r.categoryName}, {statusLabel(r.status)}
          </option>
        ))}
      </SelectField>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading || roomId === ""}>
          {loading ? "Checking in..." : "Confirm Check-in"}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function CheckInDialog({
  reservation,
}: {
  reservation: ReservationRow;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [completed, setCompleted] = useState(false);

  function close() {
    setOpen(false);
    if (completed) router.refresh();
  }

  return (
    <>
      <Button size="xs" onClick={() => setOpen(true)}>
        Check in
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={`Check in: ${reservation.guestName}`}
      >
        <CheckInBody
          reservation={reservation}
          onCompleted={() => setCompleted(true)}
          onClose={close}
        />
      </Dialog>
    </>
  );
}
