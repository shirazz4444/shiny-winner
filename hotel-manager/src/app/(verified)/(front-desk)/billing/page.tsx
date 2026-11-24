import Link from "next/link";
import Alert from "@/components/ui/Alert";
import Card from "@/components/ui/Card";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Pagination from "@/components/ui/Pagination";
import StatusBadge from "@/components/ui/StatusBadge";
import BillingFilters from "@/components/billing/BillingFilters";
import { centsToUSD } from "@/lib/format";
import { PAYMENT_METHODS, formatDate } from "@/lib/format";
import { listInvoicesSchema } from "@/schemas/invoice";
import { requireRole } from "@/services/authService";
import { listInvoices } from "@/services/invoiceService";

type BillingProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BillingPage({ searchParams }: BillingProps) {
  const session = await requireRole("ADMIN", "MANAGER", "RECEPTIONIST");
  const raw = await searchParams;

  const input: Record<string, string> = Object.fromEntries(
    Object.entries(raw).flatMap(([key, value]) => {
      const v = Array.isArray(value) ? value[0] : value;
      return v ? [[key, v]] : [];
    }),
  );
  const parsed = listInvoicesSchema.safeParse(input);
  const filters = parsed.success ? parsed.data : listInvoicesSchema.parse({});
  const { items, total, page, limit } = await listInvoices(filters, session);

  const { page: _page, ...filterParams } = input;

  type Row = (typeof items)[number];
  const columns: Column<Row>[] = [
    {
      key: "id",
      label: "Invoice",
      wrap: false,
      render: (i) => (
        <Link
          href={`/billing/${i.id}`}
          className="font-medium text-primary hover:underline"
        >
          #{i.id.slice(0, 8)}
        </Link>
      ),
    },
    { key: "guestName", label: "Guest" },
    { key: "roomNumber", label: "Room", render: (i) => i.roomNumber ?? "–" },
    {
      key: "status",
      label: "Status",
      render: (i) => <StatusBadge status={i.status} />,
    },
    {
      key: "paymentMethod",
      label: "Method",
      render: (i) => (i.paymentMethod ? PAYMENT_METHODS[i.paymentMethod] : "–"),
    },
    {
      key: "paidAt",
      label: "Paid on",
      wrap: false,
      render: (i) => (i.paidAt ? formatDate(i.paidAt) : "–"),
    },
    {
      key: "total",
      label: "Total",
      align: "right",
      wrap: false,
      render: (i) => centsToUSD(i.total),
    },
    {
      key: "refundAmount",
      label: "Refunded",
      align: "right",
      wrap: false,
      render: (i) =>
        i.refundAmount === null ? "–" : centsToUSD(i.refundAmount),
    },
  ];

  return (
    <div className="content">
      <h1 className="text-2xl font-semibold">Billing</h1>

      <Card>
        <BillingFilters
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
          caption="Invoices"
          columns={columns}
          rows={items}
          rowKey={(row) => row.id}
          emptyMessage="No invoices match these filters."
        />
        <Pagination
          page={page}
          limit={limit}
          total={total}
          basePath="/billing"
          params={filterParams}
        />
      </Card>
    </div>
  );
}
