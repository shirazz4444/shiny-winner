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

type Point = {
  categoryId: string;
  category: string;
  reservations: number;
};

export default function RoomTypeChart({ data }: { data: Point[] }) {
  const total = data.reduce((sum, p) => sum + p.reservations, 0);
  const summary = data.map((p) => `${p.category} ${p.reservations}`).join(", ");

  return (
    <BaseChart
      dataAvailable={total > 0}
      emptyMessage="No reservations yet."
      ariaLabel={`Bar chart of reservations by room type: ${summary}.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{
            top: 8,
            right: 16,
            bottom: 0,
            left: 8,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="category" width={130} />
          <Tooltip />
          <Bar
            dataKey="reservations"
            name="Reservations"
            fill="var(--primary)"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </BaseChart>
  );
}
