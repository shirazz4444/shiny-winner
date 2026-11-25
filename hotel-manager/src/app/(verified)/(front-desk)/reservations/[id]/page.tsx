import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import ModifyReservationDialog from "@/components/reservations/ModifyReservationDialog";
import ReservationStatusActions from "@/components/reservations/ReservationStatusActions";
import { NotFoundError } from "@/lib/apiResponse";
import { centsToUSD, formatDate, formatDateTime } from "@/lib/format";
import { requireRole } from "@/services/authService";
import { getReservation } from "@/services/reservationService";

type ReservationProps = {
  params: Promise<{ id: string }>;
};

export default async function ReservationPage({ params }: ReservationProps) {
  const session = await requireRole("ADMIN", "MANAGER", "RECEPTIONIST");
  const { id } = await params;

  const r = await getReservation(id, session).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });

  const modifiable = r.status === "PENDING" || r.status === "CONFIRMED";

  return (
    <div className="content">
      <Link
        href="/reservations"
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        All Reservations
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">
            Reservation #{r.id.slice(0, 8)}
          </h1>
          <StatusBadge status={r.status} />
        </div>
        {modifiable && (
          <ModifyReservationDialog
            reservation={{
              id: r.id,
              checkInDate: r.checkInDate,
              checkOutDate: r.checkOutDate,
              adults: r.adults,
              children: r.children,
              roomId: r.room?.id ?? null,
              notes: r.notes,
            }}
          />
        )}
      </div>

      <ReservationStatusActions
        id={r.id}
        status={r.status}
        hasRoom={r.room !== null}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Guest">
          <dl className="grid gap-2 sm:grid-cols-[6rem_1fr]">
            <dt className="text-muted-foreground">Name</dt>
            <dd>
              <Link
                href={`/guests/${r.guest.id}`}
                className="text-primary hover:underline"
              >
                {r.guest.fullName}
              </Link>
            </dd>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="break-all">{r.guest.email}</dd>
            <dt className="text-muted-foreground">Phone</dt>
            <dd>{r.guest.phone}</dd>
            <dt className="text-muted-foreground">Address</dt>
            <dd>{r.guest.address}</dd>
          </dl>
        </Card>

        <Card title="Stay">
          <dl className="grid gap-2 sm:grid-cols-[8rem_1fr]">
            <dt className="text-muted-foreground">Check-in</dt>
            <dd>{formatDate(r.checkInDate)}</dd>
            <dt className="text-muted-foreground">Check-out</dt>
            <dd>{formatDate(r.checkOutDate)}</dd>
            <dt className="text-muted-foreground">Nights</dt>
            <dd>{r.nights}</dd>
            <dt className="text-muted-foreground">Party</dt>
            <dd>
              {r.adults} {r.adults === 1 ? "adult" : "adults"}
              {r.children > 0 &&
                `, ${r.children} ${r.children === 1 ? "child" : "children"}`}
            </dd>
            {r.actualCheckIn && (
              <>
                <dt className="text-muted-foreground">Checked in</dt>
                <dd>{formatDateTime(r.actualCheckIn)}</dd>
              </>
            )}
            {r.actualCheckOut && (
              <>
                <dt className="text-muted-foreground">Checked out</dt>
                <dd>{formatDateTime(r.actualCheckOut)}</dd>
              </>
            )}
            {r.cancelledAt && (
              <>
                <dt className="text-muted-foreground">Cancelled</dt>
                <dd>{formatDateTime(r.cancelledAt)}</dd>
              </>
            )}
          </dl>
        </Card>

        <Card title="Room">
          {r.room ? (
            <dl className="grid gap-2 sm:grid-cols-[8rem_1fr]">
              <dt className="text-muted-foreground">Room</dt>
              <dd>{r.room.roomNumber}</dd>
              <dt className="text-muted-foreground">Price per night</dt>
              <dd>{centsToUSD(r.room.price)}</dd>
              <dt className="text-muted-foreground">Max guests</dt>
              <dd>{r.room.maxOccupancy}</dd>
              <dt className="text-muted-foreground">Room status</dt>
              <dd>
                <StatusBadge status={r.room.status} />
              </dd>
            </dl>
          ) : (
            <p className="text-muted-foreground">
              No room is assigned yet.
              {modifiable && " Use Modify to choose one."}
            </p>
          )}
        </Card>

        <Card title="Invoice">
          {r.invoice ? (
            <dl className="grid gap-2 sm:grid-cols-[8rem_1fr]">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <StatusBadge status={r.invoice.status} />
              </dd>
              <dt className="text-muted-foreground">Total</dt>
              <dd>{centsToUSD(r.invoice.total)}</dd>
              <dt className="text-muted-foreground">Invoice</dt>
              <dd>
                <Link
                  href={`/billing/${r.invoice.id}`}
                  className="text-primary hover:underline"
                >
                  Open invoice
                </Link>
              </dd>
            </dl>
          ) : (
            <p className="text-muted-foreground">
              An invoice is opened when the guest checks in.
            </p>
          )}
        </Card>
      </div>

      {r.notes && (
        <Card title="Notes">
          <p>{r.notes}</p>
        </Card>
      )}

      <p className="text-sm text-muted-foreground">
        Booked by {r.createdBy.fullName}.
      </p>
    </div>
  );
}
