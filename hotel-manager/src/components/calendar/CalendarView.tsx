"use client";

import { useEffect, useState } from "react";
import {
  BedDouble,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
} from "lucide-react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import ReservationDetailDialog from "@/components/calendar/ReservationDetailDialog";
import type { ApiResponse } from "@/lib/apiResponse";
import {
  addDays,
  eachDay,
  monthStart,
  nextMonthStart,
  today,
  weekStart,
} from "@/lib/dates";

type View = "month" | "week" | "day";
type Kind = "in" | "out" | "stay";

type CalendarReservation = {
  id: string;
  status: string;
  guestId: string;
  guestName: string;
  roomId: string | null;
  roomNumber: string | null;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
};

type CalendarData = {
  start: string;
  end: string;
  reservations: CalendarReservation[];
};

const VIEW_PARAM: Record<View, string> = {
  month: "monthly",
  week: "weekly",
  day: "daily",
};

const KIND_STYLE: Record<Kind, string> = {
  in: "border-primary/30 bg-primary/10 hover:border-primary",
  out: "border-info/30 bg-info/10 hover:border-info",
  stay: "border-border bg-card hover:border-primary",
};
const KIND_LABEL: Record<Kind, string> = {
  in: "Check-in",
  out: "Check-out",
  stay: "Staying",
};
const KIND_ICON = { in: LogIn, out: LogOut, stay: BedDouble };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]; // weeks start on Monday
const MAX_PER_MONTH_CELL = 3;

const fmt = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    ...options,
    timeZone: "UTC",
  });

function rangeFor(view: View, anchor: string): { start: string; end: string } {
  if (view === "day") return { start: anchor, end: addDays(anchor, 1) };
  if (view === "week") {
    const start = weekStart(anchor);
    return { start, end: addDays(start, 7) };
  }
  return { start: monthStart(anchor), end: nextMonthStart(anchor) };
}

function titleFor(
  view: View,
  anchor: string,
  range: { start: string; end: string },
): string {
  if (view === "month") return fmt(anchor, { month: "long", year: "numeric" });
  if (view === "day") {
    return fmt(anchor, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  return `${fmt(range.start, { month: "short", day: "numeric" })} to ${fmt(
    addDays(range.end, -1),
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  )}`;
}

function shift(view: View, anchor: string, direction: 1 | -1): string {
  if (view === "month") {
    return direction === 1
      ? nextMonthStart(anchor)
      : monthStart(addDays(monthStart(anchor), -1));
  }
  return addDays(anchor, direction * (view === "week" ? 7 : 1));
}

function Chip({
  reservation,
  kind,
  compact,
  onOpen,
}: {
  reservation: CalendarReservation;
  kind: Kind;
  compact: boolean;
  onOpen: (id: string) => void;
}) {
  const closed =
    reservation.status === "CANCELLED" || reservation.status === "NO_SHOW";
  const Icon = KIND_ICON[kind];
  const room = reservation.roomNumber
    ? `Room ${reservation.roomNumber}`
    : "No room";
  const label = `${KIND_LABEL[kind]}: ${reservation.guestName}, ${room}, ${reservation.status
    .toLowerCase()
    .replace("_", " ")}`;

  return (
    <button
      type="button"
      onClick={() => onOpen(reservation.id)}
      aria-label={label}
      title={label}
      className={`w-full cursor-pointer rounded-md border px-2 py-1 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        closed
          ? "border-border bg-muted text-muted-foreground line-through"
          : KIND_STYLE[kind]
      }`}
    >
      {compact ? (
        <span className="flex items-center gap-1 truncate">
          <Icon size={12} aria-hidden="true" className="shrink-0" />
          <span className="truncate">
            <span className="font-medium">{reservation.guestName}</span>
            {reservation.roomNumber && ` · ${reservation.roomNumber}`}
          </span>
        </span>
      ) : (
        <span className="flex flex-col gap-1">
          <span className="flex items-center gap-1 font-medium">
            <Icon size={14} aria-hidden="true" className="shrink-0" />
            {reservation.guestName}
          </span>
          <span>
            {room} · {reservation.adults + reservation.children}{" "}
            {reservation.adults + reservation.children === 1
              ? "guest"
              : "guests"}
          </span>
          <span>
            <StatusBadge status={reservation.status} />
          </span>
        </span>
      )}
    </button>
  );
}

export default function CalendarView() {
  const [todayKey] = useState(() => today());
  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState<string>(todayKey);
  const [attempt, setAttempt] = useState(0); // bumped by "Try again"
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result, setResult] = useState<{
    key: string;
    reservations: CalendarReservation[];
    error: string | null;
  } | null>(null);

  const range = rangeFor(view, anchor);
  const key = `${view}|${anchor}|${attempt}`;
  const loading = result?.key !== key;

  useEffect(() => {
    const controller = new AbortController();
    const requestKey = `${view}|${anchor}|${attempt}`;

    fetch(`/api/calendar?view=${VIEW_PARAM[view]}&date=${anchor}`, {
      signal: controller.signal,
    })
      .then((res) => res.json() as Promise<ApiResponse<CalendarData>>)
      .then((body) => {
        setResult(
          body.success
            ? {
                key: requestKey,
                error: null,
                reservations: body.data.reservations,
              }
            : { key: requestKey, error: body.error.message, reservations: [] },
        );
      })
      .catch(() => {
        if (controller.signal.aborted) return; // a newer request replaced this one
        setResult({
          key: requestKey,
          error: "Could not reach the server. Please try again.",
          reservations: [],
        });
      });

    return () => controller.abort();
  }, [view, anchor, attempt]);

  const reservations = result?.key === key ? result.reservations : [];
  const arrivals = new Map<string, CalendarReservation[]>();
  const departures = new Map<string, CalendarReservation[]>();
  for (const r of reservations) {
    arrivals.set(r.checkInDate, [...(arrivals.get(r.checkInDate) ?? []), r]);
    departures.set(r.checkOutDate, [
      ...(departures.get(r.checkOutDate) ?? []),
      r,
    ]);
  }
  const eventsOn = (d: string) => [
    ...(arrivals.get(d) ?? []).map((r) => ({ r, kind: "in" as const })),
    ...(departures.get(d) ?? []).map((r) => ({ r, kind: "out" as const })),
  ];

  function openDay(d: string) {
    setAnchor(d);
    setView("day");
  }

  const days = eachDay(range.start, addDays(range.end, -1));
  const offset = (new Date(`${range.start}T00:00:00Z`).getUTCDay() + 6) % 7;
  const monthCells: (string | null)[] = [
    ...Array<null>(offset).fill(null),
    ...days,
  ];
  while (monthCells.length % 7 !== 0) monthCells.push(null);

  const arrivalsToday = arrivals.get(anchor) ?? [];
  const departuresToday = departures.get(anchor) ?? [];
  const inHouse = reservations.filter(
    (r) => r.checkInDate < anchor && anchor < r.checkOutDate,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            aria-label={`Previous ${view}`}
            onClick={() => setAnchor(shift(view, anchor, -1))}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            aria-label={`Next ${view}`}
            onClick={() => setAnchor(shift(view, anchor, 1))}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </Button>
          <Button variant="secondary" onClick={() => setAnchor(todayKey)}>
            Today
          </Button>
        </div>

        <h2 aria-live="polite" className="text-lg font-semibold">
          {titleFor(view, anchor, range)}
        </h2>

        <div
          role="group"
          aria-label="Calendar view"
          className="flex overflow-hidden rounded-md border border-input"
        >
          {(["month", "week", "day"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`cursor-pointer px-4 py-2 text-sm capitalize outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {result?.error && !loading && (
        <div className="flex flex-wrap items-center gap-3">
          <Alert>{result.error}</Alert>
          <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </Button>
        </div>
      )}
      {loading && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading reservations...
        </p>
      )}
      {!loading && !result?.error && reservations.length === 0 && (
        <p role="status" className="text-sm text-muted-foreground">
          No reservations in this period.
        </p>
      )}

      {view === "month" && (
        <div className="overflow-x-auto">
          <div className="grid min-w-176 grid-cols-7 border-t border-l border-border">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="border-r border-b border-border bg-muted px-2 py-1 text-center text-sm font-medium"
              >
                {d}
              </div>
            ))}
            {monthCells.map((d, i) => {
              if (!d) {
                return (
                  <div
                    key={`blank-${i}`}
                    className="min-h-28 border-r border-b border-border bg-muted/50"
                  />
                );
              }
              const list = eventsOn(d);
              const isToday = d === todayKey;
              return (
                <div
                  key={d}
                  className="flex min-h-28 flex-col gap-1 border-r border-b border-border p-1"
                >
                  <button
                    type="button"
                    onClick={() => openDay(d)}
                    aria-current={isToday ? "date" : undefined}
                    aria-label={`Open ${fmt(d, { weekday: "long", month: "long", day: "numeric" })}`}
                    className={`size-7 cursor-pointer self-start rounded-full text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      isToday
                        ? "bg-primary font-semibold text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    {Number(d.slice(8))}
                  </button>
                  {list.slice(0, MAX_PER_MONTH_CELL).map(({ r, kind }) => (
                    <Chip
                      key={`${r.id}-${kind}`}
                      reservation={r}
                      kind={kind}
                      compact
                      onOpen={setSelectedId}
                    />
                  ))}
                  {list.length > MAX_PER_MONTH_CELL && (
                    <button
                      type="button"
                      onClick={() => openDay(d)}
                      className="cursor-pointer text-left text-xs text-primary hover:underline"
                    >
                      +{list.length - MAX_PER_MONTH_CELL} more
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "week" && (
        <div className="overflow-x-auto">
          <div className="grid min-w-4xl grid-cols-7 border-t border-l border-border">
            {days.map((d) => {
              const isToday = d === todayKey;
              return (
                <div
                  key={d}
                  className="flex min-h-64 flex-col gap-2 border-r border-b border-border p-2"
                >
                  <button
                    type="button"
                    onClick={() => openDay(d)}
                    aria-current={isToday ? "date" : undefined}
                    className={`cursor-pointer rounded-md px-2 py-1 text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    {fmt(d, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </button>
                  {eventsOn(d).map(({ r, kind }) => (
                    <Chip
                      key={`${r.id}-${kind}`}
                      reservation={r}
                      kind={kind}
                      compact={false}
                      onOpen={setSelectedId}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "day" && (
        <div className="flex flex-col gap-6">
          {(
            [
              ["Arrivals", "in", arrivalsToday],
              ["Departures", "out", departuresToday],
              ["Staying", "stay", inHouse],
            ] as const
          ).map(([title, kind, list]) => (
            <section
              key={title}
              aria-label={title}
              className="flex flex-col gap-2"
            >
              <h3 className="font-medium">
                {title} ({list.length})
              </h3>
              {list.length === 0 ? (
                <p className="text-sm text-muted-foreground">None.</p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((r) => (
                    <li key={r.id}>
                      <Chip
                        reservation={r}
                        kind={kind}
                        compact={false}
                        onOpen={setSelectedId}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      <ReservationDetailDialog
        reservationId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
