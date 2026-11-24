"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import type { ApiResponse } from "@/lib/apiResponse";

type Props = {
  invoiceId: string;
  item: { id: string; name: string; quantity: number };
};

export default function ItemActions({ invoiceId, item }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, method: "PATCH" | "DELETE", quantity?: number) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(
        `/api/invoices/${encodeURIComponent(invoiceId)}/items/${encodeURIComponent(item.id)}`,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: method === "PATCH" ? JSON.stringify({ quantity }) : undefined,
        },
      );
      const body: ApiResponse<unknown> = await res.json();
      if (!body.success) setError(body.error.details?.quantity?.[0] ?? body.error.message);
      else router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    }
    setBusy(null);
  }

  return (
    <div className="flex flex-col items-stretch gap-1">
      <div className="flex items-center gap-1">
        <label htmlFor={`qty-${item.id}`} className="sr-only">
          Quantity of {item.name}
        </label>
        <input
          id={`qty-${item.id}`}
          type="number"
          min={1}
          max={100}
          defaultValue={item.quantity}
          className="w-16 rounded-md border border-input bg-card px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onKeyDown={(e) => {
            if (e.key === "Enter") run("update", "PATCH", Number(e.currentTarget.value));
          }}
        />
        <Button
          variant="secondary"
          size="xs"
          disabled={busy !== null}
          onClick={() => {
            const input = document.getElementById(`qty-${item.id}`) as HTMLInputElement | null;
            run("update", "PATCH", Number(input?.value));
          }}
        >
          {busy === "update" ? "Saving..." : "Update"}
        </Button>
      </div>
      <Button variant="destructive" size="xs" disabled={busy !== null} onClick={() => run("remove", "DELETE")}>
        {busy === "remove" ? "Removing..." : "Remove"}
      </Button>
      {error && (
        <p role="alert" className="max-w-48 whitespace-normal text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
