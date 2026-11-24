"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import TextField from "@/components/ui/fields/TextField";
import type { ApiResponse } from "@/lib/apiResponse";
import { centsToUSD, USDToCents } from "@/lib/format";

type Props = {
  invoiceId: string;
  total: number;
};

export default function RefundDialog({ invoiceId, total }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldError(undefined);

    const cents = USDToCents(String(new FormData(event.currentTarget).get("amount") ?? ""));
    if (cents === null || cents < 1) {
      setFieldError("Enter an amount greater than $0.00.");
      return;
    }
    if (cents > total) {
      setFieldError(`The refund cannot exceed ${centsToUSD(total)}.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: cents }),
      });
      const body: ApiResponse<unknown> = await res.json();
      if (!body.success) setError(body.error.message);
      else {
        setOpen(false);
        router.refresh();
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    }
    setLoading(false);
  }

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => {
          setError(null);
          setFieldError(undefined);
          setOpen(true);
        }}
      >
        Issue refund
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Issue refund">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {error && <Alert>{error}</Alert>}
          <p>
            An invoice can be refunded once. After that its status becomes Refunded and the refund
            can&apos;t be changed.
          </p>
          <TextField
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min={0}
            label="Refund Amount"
            hint={`Up to ${centsToUSD(total)}. The default is the full total.`}
            defaultValue={(total / 100).toFixed(2)}
            error={fieldError}
          />
          <div className="flex gap-3">
            <Button variant="destructive" type="submit" disabled={loading}>
              {loading ? "Refunding..." : "Refund"}
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
