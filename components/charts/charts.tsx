"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber, formatUGX } from "@/lib/format";

export type ChartDatum = { label: string; value: number; sub?: string };
type ValueFormat = "money" | "int";

const COLORS = ["#059669", "#0ea5e9", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6", "#64748b"];

const fmt = (f: ValueFormat) => (v: number) => (f === "money" ? formatUGX(v) : formatNumber(v));
function compact(v: number) {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M`;
  if (a >= 1_000) return `${Math.round(v / 1_000)}K`;
  return String(v);
}

function Empty({ height, text }: { height: number; text: string }) {
  return (
    <div style={{ height }} className="flex items-center justify-center rounded-md border border-dashed border-zinc-200 text-sm text-zinc-400 dark:border-zinc-800">
      {text}
    </div>
  );
}

const tooltipStyle = { fontSize: 12, borderRadius: 6, border: "1px solid #e4e4e7" };

/** Vertical bars over time (e.g. daily net sales). */
export function TrendBarChart({ data, valueFormat = "money", height = 260, emptyText = "No sales in this period" }: { data: ChartDatum[]; valueFormat?: ValueFormat; height?: number; emptyText?: string }) {
  if (!data.length || data.every((d) => d.value === 0)) return <Empty height={height} text={emptyText} />;
  return (
    <div style={{ height }} role="img" aria-label="Bar chart">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height }}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={16} tickLine={false} />
          <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} width={44} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(v) => [fmt(valueFormat)(Number(v)), valueFormat === "money" ? "Net sales" : "Units"]}
            labelFormatter={(l, p) => {
              const sub = p?.[0]?.payload?.sub;
              return sub ? `${l} · ${sub}` : String(l);
            }}
            contentStyle={tooltipStyle}
            cursor={{ fill: "rgba(16,185,129,0.08)" }}
          />
          <Bar dataKey="value" fill="#059669" radius={[3, 3, 0, 0]} maxBarSize={40} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal bars for rankings (e.g. top products). */
export function RankBarChart({ data, valueFormat = "int", height, emptyText = "No sales in this period" }: { data: ChartDatum[]; valueFormat?: ValueFormat; height?: number; emptyText?: string }) {
  const h = height ?? Math.max(160, data.length * 34 + 24);
  if (!data.length) return <Empty height={height ?? 200} text={emptyText} />;
  return (
    <div style={{ height: h }} role="img" aria-label="Ranking chart">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 500, height: h }}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" />
          <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11 }} tickLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(v) => [fmt(valueFormat)(Number(v)), valueFormat === "money" ? "Net sales" : "Units sold"]}
            labelFormatter={(l, p) => {
              const sub = p?.[0]?.payload?.sub;
              return sub ? `${l} · ${sub}` : String(l);
            }}
            contentStyle={tooltipStyle}
            cursor={{ fill: "rgba(16,185,129,0.08)" }}
          />
          <Bar dataKey="value" fill="#0ea5e9" radius={[0, 3, 3, 0]} maxBarSize={22} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut for shares (e.g. payment methods). */
export function DonutChart({ data, valueFormat = "money", height = 260, emptyText = "No sales in this period" }: { data: ChartDatum[]; valueFormat?: ValueFormat; height?: number; emptyText?: string }) {
  const shown = data.filter((d) => d.value > 0);
  if (!shown.length) return <Empty height={height} text={emptyText} />;
  const total = shown.reduce((a, d) => a + d.value, 0);
  return (
    <div style={{ height }} role="img" aria-label="Donut chart">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height }}>
        <PieChart>
          <Pie data={shown} dataKey="value" nameKey="label" innerRadius="55%" outerRadius="80%" paddingAngle={2} isAnimationActive={false}>
            {shown.map((d, i) => (
              <Cell key={d.label} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v, n) => [`${fmt(valueFormat)(Number(v))} (${((Number(v) / total) * 100).toFixed(1)}%)`, String(n)]} contentStyle={tooltipStyle} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
