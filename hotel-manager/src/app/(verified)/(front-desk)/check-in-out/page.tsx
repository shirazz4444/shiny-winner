import Link from "next/link";
import Alert from "@/components/ui/Alert";
import Card from "@/components/ui/Card";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Pagination from "@/components/ui/Pagination";
import TabNav from "@/components/ui/TabNav";
import CheckInDialog from "@/components/checkin/CheckInDialog";
import CheckInOutFilters from "@/components/checkin/CheckInOutFilters";
import CheckOutDialog from "@/components/checkin/CheckOutDialog";
import { today } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { listReservationsSchema } from "@/schemas/reservation";
import { requireRole } from "@/services/authService";
import { listReservations } from "@/services/reservationService";

type CheckInOutProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CheckInOutPage({
  searchParams,
}: CheckInOutProps) {
  const session = await requireRole("ADMIN", "MANAGER", "RECEPTIONIST");
  const raw = await searchParams;

  const input: Record<string, string> = Object.fromEntries(
    Object.entries(raw).flatMap(([key, value]) => {
      const v = Array.isArray(value) ? value[0] : value;
      return v ? [[key, v]] : [];
    }),
  );
  const mode = input.mode === "check-out" ? "check-out" : "check-in";
  const todayKey = today();

  const status =
    mode === "check-out"
      ? "CHECKED_IN"
      : input.status === "PENDING"
        ? "PENDING"
        : "CONFIRMED";
  const endDate = input.endDate ?? todayKey;

  const parsed = listReservationsSchema.safeParse({
    status,
    ...(input.search && { search: input.search }),
    ...(mode === "check-in" && { endDate }),
    ...(input.page && { page: input.page }),
  });
  const filters = parsed.success
    ? parsed.data
    : listReservationsSchema.parse({ status });
  const { items, total, page, limit } = await listReservations(
    filters,
    session,
  );

  const { page: _page, ...filterParams } = input;

  type Row = (typeof items)[number];
  const guest: Column<Row> = {
    key: "guestName",
    label: "Guest",
    render: (r) => (
      <Link
        href={`/guests/${r.guestId}`}
        className="font-medium text-primary hover:underline"
      >
        {r.guestName}
      </Link>
    ),
  };
  const party: Column<Row> = {
    key: "adults",
    label: "Guests",
    align: "right",
    render: (r) => r.adults + r.children,
  };
  const toRow = (r: Row) => ({
    id: r.id,
    guestName: r.guestName,
    roomId: r.roomId,
    roomNumber: r.roomNumber,
    checkInDate: r.checkInDate,
    checkOutDate: r.checkOutDate,
    nights: r.nights,
    adults: r.adults,
    children: r.children,
  });

  const columns: Column<Row>[] =
    mode === "check-in"
      ? [
          guest,
          {
            key: "id",
            label: "Reservation",
            wrap: false,
            render: (r) => `#${r.id.slice(0, 8)}`,
          },
          {
            key: "checkInDate",
            label: "Arrival",
            wrap: false,
            render: (r) => formatDate(r.checkInDate),
          },
          {
            key: "checkOutDate",
            label: "Departure",
            wrap: false,
            render: (r) => formatDate(r.checkOutDate),
          },
          { key: "nights", label: "Nights", align: "right" },
          {
            key: "roomNumber",
            label: "Room",
            render: (r) => r.roomNumber ?? "Not assigned",
          },
          party,
          {
            key: "actions",
            label: "Action",
            width: "fit",
            render: (r) => <CheckInDialog reservation={toRow(r)} />,
          },
        ]
      : [
          guest,
          {
            key: "roomNumber",
            label: "Room",
            render: (r) => r.roomNumber ?? "–",
          },
          {
            key: "checkInDate",
            label: "Arrived",
            wrap: false,
            render: (r) => formatDate(r.checkInDate),
          },
          {
            key: "checkOutDate",
            label: "Due out",
            wrap: false,
            render: (r) => (
              <>
                {formatDate(r.checkOutDate)}
                {r.checkOutDate === todayKey && (
                  <span className="ml-2 text-sm font-medium text-warning">
                    Due today
                  </span>
                )}
                {r.checkOutDate < todayKey && (
                  <span className="ml-2 text-sm font-medium text-destructive">
                    Overdue
                  </span>
                )}
              </>
            ),
          },
          party,
          {
            key: "actions",
            label: "Action",
            width: "fit",
            render: (r) => <CheckOutDialog reservation={toRow(r)} />,
          },
        ];

  return (
    <div className="content">
      <h1 className="text-2xl font-semibold">Check-in / Check-out</h1>

      <TabNav
        label="Check-in or check-out"
        items={[
          {
            href: "/check-in-out?mode=check-in",
            label: "Check-in",
            active: mode === "check-in",
          },
          {
            href: "/check-in-out?mode=check-out",
            label: "Check-out",
            active: mode === "check-out",
          },
        ]}
      />

      <Card>
        <CheckInOutFilters
          mode={mode}
          search={input.search ?? ""}
          status={status}
          endDate={endDate}
        />
      </Card>

      {!parsed.success && (
        <Alert>Some filters were invalid and were ignored.</Alert>
      )}

      <Card>
        <DataTable
          caption={
            mode === "check-in"
              ? "Reservations waiting to check in"
              : "Guests currently checked in"
          }
          columns={columns}
          rows={items}
          rowKey={(row) => row.id}
          emptyMessage={
            mode === "check-in"
              ? "No reservations are waiting to be checked in."
              : "No guests are currently checked in."
          }
        />
        <Pagination
          page={page}
          limit={limit}
          total={total}
          basePath="/check-in-out"
          params={{ mode, ...filterParams }}
        />
      </Card>
    </div>
  );
}
