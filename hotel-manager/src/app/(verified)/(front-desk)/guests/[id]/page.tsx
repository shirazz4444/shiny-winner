import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarCheck, DollarSign, Moon } from "lucide-react";
import Card from "@/components/ui/Card";
import DataTable, { type Column } from "@/components/ui/DataTable";
import KpiCard from "@/components/ui/KpiCard";
import StatusBadge from "@/components/ui/StatusBadge";
import GuestFormDialog from "@/components/guests/GuestFormDialog";
import { NotFoundError } from "@/lib/apiResponse";
import { centsToUSD, formatDate } from "@/lib/format";
import { requireRole } from "@/services/authService";
import { getGuest } from "@/services/guestService";

type GuestProfileProps = {
  params: Promise<{ id: string }>;
};

export default async function GuestProfilePage({ params }: GuestProfileProps) {
  const session = await requireRole("ADMIN", "MANAGER", "RECEPTIONIST");
  const { id } = await params;

  const guest = await getGuest(id, session).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });

  type Row = (typeof guest.reservations)[number];
  const columns: Column<Row>[] = [
    {
      key: "stay",
      label: "Stay",
      wrap: false,
      render: (r) =>
        `${formatDate(r.checkInDate)} to ${formatDate(r.checkOutDate)}`,
    },
    { key: "nights", label: "Nights", align: "right" },
    {
      key: "roomNumber",
      label: "Room",
      render: (r) => r.roomNumber ?? "Not assigned",
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "invoiceStatus",
      label: "Invoice",
      render: (r) =>
        r.invoiceStatus ? <StatusBadge status={r.invoiceStatus} /> : "–",
    },
    {
      key: "invoiceTotal",
      label: "Total",
      align: "right",
      wrap: false,
      render: (r) =>
        r.invoiceTotal === null ? "–" : centsToUSD(r.invoiceTotal),
    },
  ];

  return (
    <div className="content">
      <Link
        href="/guests"
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        All Guests
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{guest.fullName}</h1>
        <GuestFormDialog
          mode="edit"
          guest={{
            id: guest.id,
            fullName: guest.fullName,
            email: guest.email,
            phone: guest.phone,
            address: guest.address,
          }}
        />
      </div>

      <Card title="Contact Details">
        <dl className="grid gap-2 sm:grid-cols-[8rem_1fr]">
          <dt className="text-muted-foreground">Email</dt>
          <dd className="break-all">{guest.email}</dd>
          <dt className="text-muted-foreground">Phone</dt>
          <dd>{guest.phone}</dd>
          <dt className="text-muted-foreground">Address</dt>
          <dd>{guest.address}</dd>
        </dl>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total Stays"
          value={guest.totalStays}
          icon={CalendarCheck}
        />
        <KpiCard label="Total Nights" value={guest.totalDays} icon={Moon} />
        <KpiCard
          label="Total Spent"
          value={centsToUSD(guest.totalSpent)}
          icon={DollarSign}
        />
      </div>

      <Card title="Stay History">
        <DataTable
          caption={`Reservations for ${guest.fullName}`}
          columns={columns}
          rows={guest.reservations}
          rowKey={(row) => row.id}
          emptyMessage="This guest has no reservations yet."
        />
      </Card>
    </div>
  );
}
