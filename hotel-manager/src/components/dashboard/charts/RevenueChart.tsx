"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import BaseChart from "@/components/dashboard/charts/BaseChart";
import { centsToUSDWhole } from "@/lib/format";

type Point = {
  month: string;
  revenue: number;
};

const monthLabel = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });

export default function RevenueChart({ data }: { data: Point[] }) {
  const hasData = data.some((p) => p.revenue !== 0);

  const summary = data
    .map((p) => `${monthLabel(p.month)} ${centsToUSDWhole(p.revenue)}`)
    .join(", ");

  return (
    <BaseChart
      dataAvailable={hasData}
      emptyMessage="No payments received yet."
      ariaLabel={`Bar chart of monthly revenue: ${summary}.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 8,
            right: 8,
            bottom: 0,
            left: 8,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tickFormatter={monthLabel} />
          <YAxis
            tickFormatter={(v) => centsToUSDWhole(Math.round(Number(v)))}
            width="auto"
          />
          <Tooltip
            labelFormatter={(m) => monthLabel(String(m))}
            formatter={(value) => [
              centsToUSDWhole(Math.round(Number(value))),
              "Revenue",
            ]}
          />
          <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </BaseChart>
  );
}
