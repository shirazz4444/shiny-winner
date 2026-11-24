import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Card from "@/components/ui/Card";
import DataTable, { type Column } from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import AddChargeForm from "@/components/billing/AddChargeForm";
import DiscountForm from "@/components/billing/DiscountForm";
import ItemActions from "@/components/billing/ItemActions";
import RefundDialog from "@/components/billing/RefundDialog";
import { NotFoundError } from "@/lib/apiResponse";
import { centsToUSD } from "@/lib/format";
import { PAYMENT_METHODS, formatDate } from "@/lib/format";
import { requireRole } from "@/services/authService";
import { getInvoice } from "@/services/invoiceService";
import { listServiceItems } from "@/services/serviceItemService";

type InvoiceProps = {
  params: Promise<{ id: string }>;
};

export default async function InvoicePage({ params }: InvoiceProps) {
  const session = await requireRole("ADMIN", "MANAGER", "RECEPTIONIST");
  const { id } = await params;

  const invoice = await getInvoice(id, session).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });

  const draft = invoice.status === "DRAFT";
  const canRefund =
    invoice.status === "PAID" &&
    (session.role === "ADMIN" || session.role === "MANAGER");
  const services = draft ? (await listServiceItems({}, session)).items : [];
  const { reservation } = invoice;

  type Row = {
    id: string;
    kind: "room" | "item";
    description: string;
    unitPrice: number;
    quantity: number;
    total: number;
  };
  const rows: Row[] = [
    {
      id: "room",
      kind: "room",
      description: `Room ${reservation.roomNumber ?? "(not assigned)"}`,
      unitPrice: Math.round(invoice.roomCharge / reservation.nights),
      quantity: reservation.nights,
      total: invoice.roomCharge,
    },
    ...invoice.items.map((i) => ({
      id: i.id,
      kind: "item" as const,
      description: i.name,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      total: i.total,
    })),
  ];

  const columns: Column<Row>[] = [
    { key: "description", label: "Description", width: 3 },
    {
      key: "unitPrice",
      label: "Unit Price",
      align: "right",
      wrap: false,
      render: (r) => centsToUSD(r.unitPrice),
    },
    { key: "quantity", label: "Qty", align: "right" },
    {
      key: "total",
      label: "Amount",
      align: "right",
      wrap: false,
      render: (r) => centsToUSD(r.total),
    },
  ];
  if (draft) {
    columns.push({
      key: "actions",
      label: "Actions",
      width: "fit",
      render: (r) =>
        r.kind === "item" ? (
          <ItemActions
            invoiceId={invoice.id}
            item={{ id: r.id, name: r.description, quantity: r.quantity }}
          />
        ) : (
          <span className="text-sm text-muted-foreground">–</span>
        ),
    });
  }

  const taxPercent = Math.round(invoice.taxRate * 1000) / 10;

  return (
    <div className="content">
      <Link
        href="/billing"
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        All Invoices
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">
            Invoice #{invoice.id.slice(0, 8)}
          </h1>
          <StatusBadge status={invoice.status} />
        </div>
        {canRefund && (
          <RefundDialog invoiceId={invoice.id} total={invoice.total} />
        )}
      </div>

      {draft && (
        <Alert variant="info">
          This invoice is a draft. It is settled when the guest checks out, and
          charges and the discount can only be changed until then.
        </Alert>
      )}

      <Card title="Stay">
        <dl className="grid gap-2 sm:grid-cols-[8rem_1fr]">
          <dt className="text-muted-foreground">Guest</dt>
          <dd>
            <Link
              href={`/guests/${reservation.guestId}`}
              className="text-primary hover:underline"
            >
              {reservation.guestName}
            </Link>
          </dd>
          <dt className="text-muted-foreground">Room</dt>
          <dd>{reservation.roomNumber ?? "Not assigned"}</dd>
          <dt className="text-muted-foreground">Dates</dt>
          <dd>
            {formatDate(reservation.checkInDate)} to{" "}
            {formatDate(reservation.checkOutDate)} ({reservation.nights}{" "}
            {reservation.nights === 1 ? "night" : "nights"})
          </dd>
          <dt className="text-muted-foreground">Reservation</dt>
          <dd>
            <Link
              href={`/reservations/${reservation.id}`}
              className="text-primary hover:underline"
            >
              View Reservation
            </Link>
          </dd>
        </dl>
      </Card>

      <Card title="Charges">
        <DataTable
          caption="Invoice charges"
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
        />
        <dl className="mt-4 ml-auto grid max-w-sm grid-cols-2 gap-1 border-t border-border pt-4">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="text-right tabular-nums">
            {centsToUSD(invoice.subtotal)}
          </dd>
          {invoice.discount > 0 && (
            <>
              <dt className="text-muted-foreground">Discount</dt>
              <dd className="text-right tabular-nums">
                -{centsToUSD(invoice.discount)}
              </dd>
            </>
          )}
          <dt className="text-muted-foreground">Tax ({taxPercent}%)</dt>
          <dd className="text-right tabular-nums">
            {centsToUSD(invoice.taxAmount)}
          </dd>
          <dt className="text-lg font-semibold">Total</dt>
          <dd className="text-right text-lg font-semibold tabular-nums">
            {centsToUSD(invoice.total)}
          </dd>
        </dl>
      </Card>

      {draft && (
        <>
          <Card title="Add a Service Charge">
            <AddChargeForm invoiceId={invoice.id} services={services} />
          </Card>
          <Card title="Discount">
            <DiscountForm
              invoiceId={invoice.id}
              discount={invoice.discount}
              subtotal={invoice.subtotal}
            />
          </Card>
        </>
      )}

      {!draft && (
        <Card title="Payment">
          <dl className="grid gap-2 sm:grid-cols-[8rem_1fr]">
            <dt className="text-muted-foreground">Method</dt>
            <dd>
              {invoice.paymentMethod
                ? PAYMENT_METHODS[invoice.paymentMethod]
                : "–"}
            </dd>
            <dt className="text-muted-foreground">Paid on</dt>
            <dd>{invoice.paidAt ? formatDate(invoice.paidAt) : "–"}</dd>
            <dt className="text-muted-foreground">Taken by</dt>
            <dd>{invoice.paidByName ?? "–"}</dd>
            {invoice.refundedAt && (
              <>
                <dt className="text-muted-foreground">Refunded on</dt>
                <dd>{formatDate(invoice.refundedAt)}</dd>
                <dt className="text-muted-foreground">Refund amount</dt>
                <dd>
                  {invoice.refundAmount === null
                    ? "–"
                    : centsToUSD(invoice.refundAmount)}
                </dd>
              </>
            )}
          </dl>
        </Card>
      )}
    </div>
  );
}
