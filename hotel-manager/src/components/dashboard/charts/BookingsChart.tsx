"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import BaseChart, { dayLabel } from "@/components/dashboard/charts/BaseChart";

type Point = {
  date: string;
  bookings: number;
};

export default function BookingsChart({ data }: { data: Point[] }) {
  const total = data.reduce((sum, p) => sum + p.bookings, 0);

  return (
    <BaseChart
      dataAvailable={total > 0}
      emptyMessage={`No bookings with a check-in in the last ${data.length} days.`}
      ariaLabel={`Line chart: ${total} bookings with a check-in over the last ${data.length} days.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 8,
            right: 8,
            bottom: 0,
            left: -16,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={dayLabel} minTickGap={32} />
          <YAxis allowDecimals={false} />
          <Tooltip labelFormatter={(d) => dayLabel(String(d))} />
          <Line
            type="monotone"
            dataKey="bookings"
            name="Bookings"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </BaseChart>
  );
}
