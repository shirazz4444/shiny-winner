"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import TextField from "@/components/ui/fields/TextField";
import type { ApiResponse } from "@/lib/apiResponse";
import { centsToUSD, USDToCents } from "@/lib/format";

type Props = {
  invoiceId: string;
  discount: number;
  subtotal: number;
};

export default function DiscountForm({ invoiceId, discount, subtotal }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldError(undefined);

    const cents = USDToCents(String(new FormData(event.currentTarget).get("discount") ?? ""));
    if (cents === null) {
      setFieldError("Enter a discount of $0.00 or more.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}/discount`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discount: cents }),
      });
      const body: ApiResponse<unknown> = await res.json();
      if (!body.success) setError(body.error.message);
      else router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-wrap items-end gap-4">
        <TextField
          id="discount"
          name="discount"
          type="number"
          step="0.01"
          min={0}
          label="Discount"
          hint={`A flat amount, up to the subtotal of ${centsToUSD(subtotal)}.`}
          defaultValue={(discount / 100).toFixed(2)}
          error={fieldError}
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Apply Discount"}
        </Button>
      </div>
    </form>
  );
}
