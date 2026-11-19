"use client";

import type { ReactNode } from "react";

type BaseChartProps = {
  dataAvailable: boolean;
  emptyMessage: string;
  ariaLabel: string;
  children: ReactNode;
};

export const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

// not actually to be used on its own, instead derive chart components from it
export default function BaseChart({
  dataAvailable,
  emptyMessage,
  ariaLabel,
  children,
}: BaseChartProps) {
  if (!dataAvailable) {
    return <p className="text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div role="img" aria-label={ariaLabel} className="h-72">
      {children}
    </div>
  );
}
