"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Alert from "@/components/ui/Alert";
import Button, { buttonClass } from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import StatusBadge from "@/components/ui/StatusBadge";
import type { ApiResponse } from "@/lib/apiResponse";
import { centsToUSD, formatDate } from "@/lib/format";

type Detail = {
  id: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  adults: number;
  children: number;
  actualCheckIn: string | null;
  actualCheckOut: string | null;
  notes: string | null;
  createdBy: { id: string; fullName: string };
  guest: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    address: string;
  };
  room: {
    id: string;
    roomNumber: string;
    price: number;
    maxOccupancy: number;
    status: string;
  } | null;
  invoice: { id: string; status: string; total: number } | null;
};

type Props = {
  reservationId: string | null;
  onClose: () => void;
};

const dateTime = (value: string) =>
  new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

export default function ReservationDetailDialog({
  reservationId,
  onClose,
}: Props) {
  const [attempt, setAttempt] = useState(0); // bumped by "Try again"
  const [result, setResult] = useState<{
    key: string;
    data: Detail | null;
    error: string | null;
  } | null>(null);

  const key = `${reservationId}|${attempt}`;
  const loading = reservationId !== null && result?.key !== key;

  useEffect(() => {
    if (!reservationId) return;
    const controller = new AbortController();
    const requestKey = `${reservationId}|${attempt}`;

    fetch(`/api/reservations/${encodeURIComponent(reservationId)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json() as Promise<ApiResponse<Detail>>)
      .then((body) => {
        setResult(
          body.success
            ? { key: requestKey, data: body.data, error: null }
            : { key: requestKey, data: null, error: body.error.message },
        );
      })
      .catch(() => {
        if (controller.signal.aborted) return; // a newer request replaced this one
        setResult({
          key: requestKey,
          data: null,
          error: "Could not reach the server. Please try again.",
        });
      });

    return () => controller.abort();
  }, [reservationId, attempt]);

  const data = result?.key === key ? result.data : null;
  const error = result?.key === key ? result.error : null;

  return (
    <Dialog open={reservationId !== null} onClose={onClose} title="Reservation">
      {loading && (
        <p role="status" className="text-muted-foreground">
          Loading reservation...
        </p>
      )}

      {error && (
        <div className="flex flex-col items-start gap-3">
          <Alert>{error}</Alert>
          <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </Button>
        </div>
      )}

      {data && (
        <div className="flex flex-col gap-4">
          <dl className="grid gap-2 sm:grid-cols-[8rem_1fr]">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <StatusBadge status={data.status} />
            </dd>
            <dt className="text-muted-foreground">Guest</dt>
            <dd>
              <Link
                href={`/guests/${data.guest.id}`}
                className="text-primary hover:underline"
              >
                {data.guest.fullName}
              </Link>
            </dd>
            <dt className="text-muted-foreground">Contact</dt>
            <dd>
              <span className="break-all">{data.guest.email}</span>,{" "}
              {data.guest.phone}
            </dd>
            <dt className="text-muted-foreground">Stay</dt>
            <dd>
              {formatDate(data.checkInDate)} to {formatDate(data.checkOutDate)}{" "}
              ({data.nights} {data.nights === 1 ? "night" : "nights"})
            </dd>
            <dt className="text-muted-foreground">Party</dt>
            <dd>
              {data.adults} {data.adults === 1 ? "adult" : "adults"}
              {data.children > 0 &&
                `, ${data.children} ${data.children === 1 ? "child" : "children"}`}
            </dd>
            <dt className="text-muted-foreground">Room</dt>
            <dd>
              {data.room
                ? `${data.room.roomNumber} (${centsToUSD(data.room.price)} per night)`
                : "Not assigned"}
            </dd>
            {data.actualCheckIn && (
              <>
                <dt className="text-muted-foreground">Checked in</dt>
                <dd>{dateTime(data.actualCheckIn)}</dd>
              </>
            )}
            {data.actualCheckOut && (
              <>
                <dt className="text-muted-foreground">Checked out</dt>
                <dd>{dateTime(data.actualCheckOut)}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Invoice</dt>
            <dd className="flex items-center gap-2">
              {data.invoice ? (
                <>
                  <StatusBadge status={data.invoice.status} />
                  {centsToUSD(data.invoice.total)}
                </>
              ) : (
                "None yet"
              )}
            </dd>
            {data.notes && (
              <>
                <dt className="text-muted-foreground">Notes</dt>
                <dd>{data.notes}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Booked by</dt>
            <dd>{data.createdBy.fullName}</dd>
          </dl>
          <Link
            href={`/reservations/${data.id}`}
            className={`${buttonClass("primary")} self-start`}
          >
            Open full reservation
          </Link>
        </div>
      )}
    </Dialog>
  );
}
