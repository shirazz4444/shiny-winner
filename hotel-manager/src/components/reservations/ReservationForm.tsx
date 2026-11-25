"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import SelectField from "@/components/ui/fields/SelectField";
import TextareaField from "@/components/ui/fields/TextareaField";
import TextField from "@/components/ui/fields/TextField";
import GuestPicker, {
  type PickedGuest,
} from "@/components/reservations/GuestPicker";
import type { AvailableRoom } from "@/components/checkin/types";
import { useApiData } from "@/hooks/useApiData";
import type { ApiResponse } from "@/lib/apiResponse";
import { centsToUSD } from "@/lib/format";

export type ReservationFormInitial = {
  guest: PickedGuest | null;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  roomId: string;
  notes: string;
  status: "PENDING" | "CONFIRMED";
};

type Props = {
  mode: "create" | "edit";
  reservationId?: string;
  initial: ReservationFormInitial;
  onDone?: () => void;
  onCancel?: () => void;
};

export default function ReservationForm({
  mode,
  reservationId,
  initial,
  onDone,
  onCancel,
}: Props) {
  const router = useRouter();
  const editing = mode === "edit";

  const [guest, setGuest] = useState<PickedGuest | null>(initial.guest);
  const [checkIn, setCheckIn] = useState(initial.checkInDate);
  const [checkOut, setCheckOut] = useState(initial.checkOutDate);
  const [adults, setAdults] = useState(String(initial.adults));
  const [children, setChildren] = useState(String(initial.children));
  const [roomId, setRoomId] = useState(initial.roomId);
  const [status, setStatus] = useState(initial.status);
  const [notes, setNotes] = useState(initial.notes);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const adultsNumber = Number(adults);
  const childrenNumber = Number(children);
  const datesValid = checkIn !== "" && checkOut !== "" && checkOut > checkIn;
  const partyValid =
    Number.isInteger(adultsNumber) &&
    adultsNumber >= 1 &&
    Number.isInteger(childrenNumber) &&
    childrenNumber >= 0;

  const roomsUrl =
    datesValid && partyValid
      ? `/api/reservations/available-rooms?${new URLSearchParams({
          checkIn,
          checkOut,
          adults: String(adultsNumber),
          children: String(childrenNumber),
          ...(editing && reservationId
            ? { excludeReservationId: reservationId }
            : {}),
        })}`
      : null;
  const rooms = useApiData<{ items: AvailableRoom[]; nights: number }>(
    roomsUrl,
  );

  const roomMissing =
    roomId !== "" &&
    !!rooms.data &&
    !rooms.data.items.some((r) => r.id === roomId);
  const effectiveRoomId = roomMissing ? "" : roomId;

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const errors: Record<string, string[]> = {};
    if (!editing && !guest) errors.guestId = ["Choose a guest."];
    if (checkIn === "") errors.checkInDate = ["Choose a check-in date."];
    if (checkOut === "") errors.checkOutDate = ["Choose a check-out date."];
    else if (checkIn !== "" && checkOut <= checkIn)
      errors.checkOutDate = ["Check-out must be after check-in."];
    if (!Number.isInteger(adultsNumber) || adultsNumber < 1)
      errors.adults = ["At least 1 adult."];
    if (!Number.isInteger(childrenNumber) || childrenNumber < 0)
      errors.children = ["Enter 0 or more."];
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    const payload = {
      roomId: effectiveRoomId || null,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      adults: adultsNumber,
      children: childrenNumber,
      notes: notes.trim() || null,
    };

    try {
      const res = await fetch(
        editing
          ? `/api/reservations/${encodeURIComponent(reservationId ?? "")}`
          : "/api/reservations",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editing ? payload : { ...payload, guestId: guest?.id, status },
          ),
        },
      );
      const body: ApiResponse<{ id: string } | null> = await res.json();

      if (!body.success) {
        setError(body.error.message);
        setFieldErrors(body.error.details ?? {});
      } else if (editing) {
        onDone?.();
        router.refresh();
      } else {
        router.push(`/reservations/${(body.data as { id: string }).id}`);
        return;
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    }
    setLoading(false);
  }

  const first = (field: string) => fieldErrors[field]?.[0];

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {error && <Alert>{error}</Alert>}

      {!editing && (
        <GuestPicker
          value={guest}
          onChange={setGuest}
          error={first("guestId")}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="checkInDate"
          type="date"
          label="Check-in"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          error={first("checkInDate")}
        />
        <TextField
          id="checkOutDate"
          type="date"
          label="Check-out"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          error={first("checkOutDate")}
        />
        <TextField
          id="adults"
          type="number"
          min={1}
          label="Adults"
          value={adults}
          onChange={(e) => setAdults(e.target.value)}
          error={first("adults")}
        />
        <TextField
          id="children"
          type="number"
          min={0}
          label="Children"
          value={children}
          onChange={(e) => setChildren(e.target.value)}
          error={first("children")}
        />
      </div>

      <SelectField
        id="roomId"
        label="Room"
        value={effectiveRoomId}
        onChange={(e) => setRoomId(e.target.value)}
        disabled={rooms.loading}
        hint={
          roomsUrl === null
            ? "Choose valid dates and a party size to see the rooms that are free."
            : roomMissing
              ? "The previously selected room isn't free for these dates."
              : "Only rooms that are free for these dates and fit the party are listed."
        }
        error={first("roomId")}
      >
        <option value="">Leave unassigned for now</option>
        {rooms.data?.items.map((r) => (
          <option key={r.id} value={r.id}>
            Room {r.roomNumber}: {r.categoryName}, {centsToUSD(r.price)} per
            night ({centsToUSD(r.estimatedTotal)} total)
          </option>
        ))}
      </SelectField>
      {rooms.error && <Alert>{rooms.error}</Alert>}

      {!editing && (
        <SelectField
          id="status"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as "PENDING" | "CONFIRMED")}
          hint="A reservation needs a room before it can be confirmed."
          error={first("status")}
        >
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
        </SelectField>
      )}

      <TextareaField
        id="notes"
        label="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        error={first("notes")}
      />

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading
            ? "Saving..."
            : editing
              ? "Save changes"
              : "Create reservation"}
        </Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
