"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export type SearchTermPoint = {
  term: string;
  count: number;
};

export function SearchBarChart({ data }: { data: SearchTermPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="term" stroke="#94a3b8" tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" allowDecimals={false} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: "0.75rem",
              borderColor: "#e2e8f0",
            }}
          />
          <Bar dataKey="count" fill="var(--analytics-bar, #0f172b)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
