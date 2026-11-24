"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import SelectField from "@/components/ui/fields/SelectField";
import TextField from "@/components/ui/fields/TextField";
import type { ApiResponse } from "@/lib/apiResponse";
import { centsToUSD } from "@/lib/format";

type Props = {
  invoiceId: string;
  services: { id: string; name: string; price: number }[];
};

export default function AddChargeForm({ invoiceId, services }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  if (services.length === 0) {
    return <p className="text-muted-foreground">No service items are available to add.</p>;
  }

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const form = new FormData(formElement);
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceItemId: form.get("serviceItemId"),
          quantity: Number(form.get("quantity")),
        }),
      });
      const body: ApiResponse<unknown> = await res.json();

      if (!body.success) {
        setError(body.error.message);
        setFieldErrors(body.error.details ?? {});
      } else {
        formElement.reset();
        router.refresh();
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    }
    setLoading(false);
  }

  const first = (field: string) => fieldErrors[field]?.[0];

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-wrap items-end gap-4">
        <SelectField id="serviceItemId" name="serviceItemId" label="Service" error={first("serviceItemId")}>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({centsToUSD(s.price)})
            </option>
          ))}
        </SelectField>
        <TextField
          id="quantity"
          name="quantity"
          type="number"
          min={1}
          max={100}
          label="Quantity"
          defaultValue={1}
          error={first("quantity")}
          className="w-24"
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Adding..." : "Add Charge"}
        </Button>
      </div>
    </form>
  );
}
