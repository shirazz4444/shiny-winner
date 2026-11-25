import Link from "next/link";
import { Plus } from "lucide-react";
import Alert from "@/components/ui/Alert";
import { buttonClass } from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Pagination from "@/components/ui/Pagination";
import StatusBadge from "@/components/ui/StatusBadge";
import ReservationFilters from "@/components/reservations/ReservationFilters";
import { formatDate } from "@/lib/format";
import { listReservationsSchema } from "@/schemas/reservation";
import { requireRole } from "@/services/authService";
import { listReservations } from "@/services/reservationService";

type ReservationsProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReservationsPage({
  searchParams,
}: ReservationsProps) {
  const session = await requireRole("ADMIN", "MANAGER", "RECEPTIONIST");
  const raw = await searchParams;

  const input: Record<string, string> = Object.fromEntries(
    Object.entries(raw).flatMap(([key, value]) => {
      const v = Array.isArray(value) ? value[0] : value;
      return v ? [[key, v]] : [];
    }),
  );
  const parsed = listReservationsSchema.safeParse(input);
  const filters = parsed.success
    ? parsed.data
    : listReservationsSchema.parse({});
  const { items, total, page, limit } = await listReservations(
    filters,
    session,
  );

  const { page: _page, ...filterParams } = input;

  type Row = (typeof items)[number];
  const columns: Column<Row>[] = [
    {
      key: "id",
      label: "Reservation",
      wrap: false,
      render: (r) => (
        <Link
          href={`/reservations/${r.id}`}
          className="font-medium text-primary hover:underline"
        >
          #{r.id.slice(0, 8)}
        </Link>
      ),
    },
    {
      key: "guestName",
      label: "Guest",
      render: (r) => (
        <Link href={`/guests/${r.guestId}`} className="hover:underline">
          {r.guestName}
        </Link>
      ),
    },
    {
      key: "roomNumber",
      label: "Room",
      render: (r) => r.roomNumber ?? "Not assigned",
    },
    {
      key: "checkInDate",
      label: "Check-in",
      wrap: false,
      render: (r) => formatDate(r.checkInDate),
    },
    {
      key: "checkOutDate",
      label: "Check-out",
      wrap: false,
      render: (r) => formatDate(r.checkOutDate),
    },
    { key: "nights", label: "Nights", align: "right" },
    {
      key: "adults",
      label: "Guests",
      align: "right",
      render: (r) => r.adults + r.children,
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <div className="content">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Reservations</h1>
        <Link href="/reservations/new" className={buttonClass()}>
          <Plus size={18} aria-hidden="true" />
          New Reservation
        </Link>
      </div>

      <Card>
        <ReservationFilters
          search={input.search ?? ""}
          status={input.status ?? ""}
          startDate={input.startDate ?? ""}
          endDate={input.endDate ?? ""}
        />
      </Card>

      {!parsed.success && (
        <Alert>Some filters were invalid and were ignored.</Alert>
      )}

      <Card>
        <DataTable
          caption="Reservations"
          columns={columns}
          rows={items}
          rowKey={(row) => row.id}
          emptyMessage="No reservations match these filters."
        />
        <Pagination
          page={page}
          limit={limit}
          total={total}
          basePath="/reservations"
          params={filterParams}
        />
      </Card>
    </div>
  );
}
