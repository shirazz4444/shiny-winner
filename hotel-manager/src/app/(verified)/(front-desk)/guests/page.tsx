import Link from "next/link";
import Alert from "@/components/ui/Alert";
import Card from "@/components/ui/Card";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Pagination from "@/components/ui/Pagination";
import GuestFormDialog from "@/components/guests/GuestFormDialog";
import GuestSearch from "@/components/guests/GuestSearch";
import { centsToUSD } from "@/lib/format";
import { listGuestsSchema } from "@/schemas/guest";
import { requireRole } from "@/services/authService";
import { listGuests } from "@/services/guestService";

type GuestsProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GuestsPage({ searchParams }: GuestsProps) {
  const session = await requireRole("ADMIN", "MANAGER", "RECEPTIONIST");
  const raw = await searchParams;

  const input: Record<string, string> = Object.fromEntries(
    Object.entries(raw).flatMap(([key, value]) => {
      const v = Array.isArray(value) ? value[0] : value;
      return v ? [[key, v]] : [];
    }),
  );
  const parsed = listGuestsSchema.safeParse(input);
  const filters = parsed.success ? parsed.data : listGuestsSchema.parse({});
  const { items, total, page, limit } = await listGuests(filters, session);

  const { page: _page, ...filterParams } = input;

  type Row = (typeof items)[number];
  const columns: Column<Row>[] = [
    {
      key: "fullName",
      label: "Name",
      render: (g) => (
        <Link
          href={`/guests/${g.id}`}
          className="font-medium text-primary hover:underline"
        >
          {g.fullName}
        </Link>
      ),
    },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone", wrap: false },
    { key: "totalStays", label: "Stays", align: "right" },
    { key: "totalDays", label: "Nights", align: "right" },
    {
      key: "totalSpent",
      label: "Total Spent",
      align: "right",
      wrap: false,
      render: (g) => centsToUSD(g.totalSpent),
    },
  ];

  return (
    <div className="content">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Guests</h1>
        <GuestFormDialog mode="create" />
      </div>

      <Card>
        <GuestSearch search={input.search ?? ""} />
      </Card>

      {!parsed.success && (
        <Alert>Some filters were invalid and were ignored.</Alert>
      )}

      <Card>
        <DataTable
          caption="Guests"
          columns={columns}
          rows={items}
          rowKey={(row) => row.id}
          emptyMessage="No guests match this search."
        />
        <Pagination
          page={page}
          limit={limit}
          total={total}
          basePath="/guests"
          params={filterParams}
        />
      </Card>
    </div>
  );
}
