"use client";

import { useState, type SubmitEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Alert from "@/components/ui/Alert";
import Button, { buttonClass } from "@/components/ui/Button";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Dialog from "@/components/ui/Dialog";
import SelectField from "@/components/ui/fields/SelectField";
import type {
  InvoiceDetail,
  ReservationDetail,
  ReservationRow,
} from "@/components/checkin/types";
import { useApiData } from "@/hooks/useApiData";
import type { ApiResponse } from "@/lib/apiResponse";
import { centsToUSD } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/format";

type BodyProps = {
  reservation: ReservationRow;
  onCompleted: () => void;
  onClose: () => void;
};

function CheckOutBody({ reservation, onCompleted, onClose }: BodyProps) {
  const detail = useApiData<ReservationDetail>(
    `/api/reservations/${encodeURIComponent(reservation.id)}`,
  );
  const invoiceId = detail.data?.invoice?.id;
  const invoice = useApiData<InvoiceDetail>(
    invoiceId ? `/api/invoices/${encodeURIComponent(invoiceId)}` : null,
  );

  const [method, setMethod] = useState("CARD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    total: number;
    method: string;
    invoiceId: string;
  } | null>(null);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/reservations/${encodeURIComponent(reservation.id)}/check-out`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentMethod: method }),
        },
      );
      const body: ApiResponse<{ invoiceId: string; total: number }> =
        await res.json();

      if (!body.success) {
        setError(body.error.message);
      } else {
        setResult({
          total: body.data.total,
          method,
          invoiceId: body.data.invoiceId,
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
          {reservation.guestName} checked out. {centsToUSD(result.total)} was
          paid by {PAYMENT_METHODS[result.method]}, and room{" "}
          {reservation.roomNumber ?? ""} was handed to housekeeping.
        </Alert>
        <div className="flex gap-3">
          <Link
            href={`/billing/${result.invoiceId}`}
            className={buttonClass("secondary")}
          >
            View Final Invoice
          </Link>
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    );
  }

  if (detail.loading || invoice.loading) {
    return (
      <p role="status" className="text-muted-foreground">
        Loading the bill...
      </p>
    );
  }

  if (detail.error || invoice.error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert>{detail.error ?? invoice.error}</Alert>
        <Button
          variant="secondary"
          onClick={() => {
            detail.retry();
            invoice.retry();
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (!detail.data || !invoice.data) {
    return (
      <Alert>
        This reservation has no invoice, so it can&apos;t be checked out.
      </Alert>
    );
  }

  const inv = invoice.data;
  type Row = {
    id: string;
    description: string;
    quantity: number;
    total: number;
  };
  const rows: Row[] = [
    {
      id: "room",
      description: `Room ${inv.reservation.roomNumber ?? ""} (${centsToUSD(Math.round(inv.roomCharge / inv.reservation.nights))} per night)`,
      quantity: inv.reservation.nights,
      total: inv.roomCharge,
    },
    ...inv.items.map((i) => ({
      id: i.id,
      description: `${i.name} (${centsToUSD(i.unitPrice)} each)`,
      quantity: i.quantity,
      total: i.total,
    })),
  ];
  const columns: Column<Row>[] = [
    { key: "description", label: "Charge", width: 3 },
    { key: "quantity", label: "Qty", align: "right" },
    {
      key: "total",
      label: "Amount",
      align: "right",
      wrap: false,
      render: (r) => centsToUSD(r.total),
    },
  ];

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {error && <Alert>{error}</Alert>}

      <div>
        <h3 className="mb-2 font-medium">Final bill</h3>
        <DataTable
          caption="Charges"
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
        />
        <dl className="mt-3 ml-auto grid max-w-xs grid-cols-2 gap-1 border-t border-border pt-3">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="text-right tabular-nums">
            {centsToUSD(inv.subtotal)}
          </dd>
          {inv.discount > 0 && (
            <>
              <dt className="text-muted-foreground">Discount</dt>
              <dd className="text-right tabular-nums">
                -{centsToUSD(inv.discount)}
              </dd>
            </>
          )}
          <dt className="text-muted-foreground">
            Tax ({Math.round(inv.taxRate * 1000) / 10}%)
          </dt>
          <dd className="text-right tabular-nums">
            {centsToUSD(inv.taxAmount)}
          </dd>
          <dt className="font-semibold">Amount due</dt>
          <dd className="text-right font-semibold tabular-nums">
            {centsToUSD(inv.total)}
          </dd>
        </dl>
        <p className="mt-3 text-sm text-muted-foreground">
          Need to add a service charge or a discount first?{" "}
          <Link
            href={`/billing/${inv.id}`}
            className="text-primary hover:underline"
          >
            Open the invoice
          </Link>
          .
        </p>
      </div>

      <SelectField
        id="paymentMethod"
        label="Payment method"
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        hint="Payments are simulated. Confirming records the payment and checks the guest out."
      >
        {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </SelectField>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Checking out..." : `Record Payment and Check out`}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function CheckOutDialog({
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
        Check out
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={`Check out: ${reservation.guestName}`}
      >
        <CheckOutBody
          reservation={reservation}
          onCompleted={() => setCompleted(true)}
          onClose={close}
        />
      </Dialog>
    </>
  );
}
