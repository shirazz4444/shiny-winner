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
  occupiedRooms: number;
  occupancyRate: number;
};

export default function OccupancyChart({ data }: { data: Point[] }) {
  const average =
    data.length > 0
      ? Math.round(
          data.reduce((sum, p) => sum + p.occupancyRate, 0) / data.length,
        )
      : 0;

  return (
    <BaseChart
      dataAvailable={data.some((p) => p.occupiedRooms > 0)}
      emptyMessage={`No occupancy recorded in the last ${data.length} days.`}
      ariaLabel={`Line chart of daily room occupancy over the last ${data.length} days, averaging ${average} percent.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 8,
            right: 8,
            bottom: 0,
            left: -8,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={dayLabel} minTickGap={32} />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            allowDecimals={false}
          />
          <Tooltip
            labelFormatter={(d) => dayLabel(String(d))}
            formatter={(value) => [`${value}%`, "Occupancy"]}
          />
          <Line
            type="monotone"
            dataKey="occupancyRate"
            name="Occupancy"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </BaseChart>
  );
}
