"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import TextField from "@/components/ui/fields/TextField";
import { useApiData } from "@/hooks/useApiData";

export type PickedGuest = { id: string; fullName: string };

type Props = {
  value: PickedGuest | null;
  onChange: (guest: PickedGuest | null) => void;
  error?: string;
};

export default function GuestPicker({ value, onChange, error }: Props) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useApiData<{
    items: { id: string; fullName: string; email: string; phone: string }[];
  }>(
    !value && debounced.length >= 2
      ? `/api/guests?search=${encodeURIComponent(debounced)}&limit=8`
      : null,
  );

  if (value) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Guest</span>
        <div className="flex items-center gap-3">
          <span>{value.fullName}</span>
          <Button variant="secondary" size="xs" onClick={() => onChange(null)}>
            Change
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <TextField
        id="guestSearch"
        label="Guest"
        placeholder="Search by name, email, or phone"
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        error={error}
      />

      {results.loading && (
        <p role="status" className="text-sm text-muted-foreground">
          Searching...
        </p>
      )}
      {results.error && (
        <p className="text-sm text-destructive">{results.error}</p>
      )}
      {results.data && results.data.items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No guests found.{" "}
          <a
            href="/guests"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            Add the guest first
          </a>
          .
        </p>
      )}
      {results.data && results.data.items.length > 0 && (
        <ul className="flex flex-col gap-1">
          {results.data.items.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => {
                  onChange({ id: g.id, fullName: g.fullName });
                  setQuery("");
                }}
                className="w-full cursor-pointer rounded-md border border-border px-3 py-2 text-left hover:border-primary"
              >
                <span className="font-medium">{g.fullName}</span>{" "}
                <span className="text-sm text-muted-foreground">
                  {g.email} · {g.phone}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
