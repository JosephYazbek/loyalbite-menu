"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export type DailyViewPoint = {
  date: string;
  count: number;
};

type ViewsChartProps = {
  data: DailyViewPoint[];
};

export function ViewsChart({ data }: ViewsChartProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#94a3b8"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#94a3b8"
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "0.75rem",
              borderColor: "#e2e8f0",
            }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#0f172b"
            strokeWidth={3}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
