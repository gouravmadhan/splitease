import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatINR } from "@/lib/money";
import type { Slice } from "@/lib/types";

export const COLORS = ["#5b8a2b", "#2f9e8f", "#e0a21b", "#d0583a", "#7c5cc4", "#3b82c4", "#8a9486"];
const tick = { fill: "#8a9486", fontSize: 12 };
const rs = (d: Slice[]) => d.map((x) => ({ name: x.name, value: x.valuePaise / 100 })); // display only
const tip = (v: unknown) => formatINR(Math.round(Number(v) * 100));
// Recharts colours tooltip text itself (dark by default), so text colours are set explicitly for both themes.
const tipProps = {
  formatter: tip,
  contentStyle: { borderRadius: 12, border: "1px solid hsl(var(--line))", background: "hsl(var(--card))", boxShadow: "0 8px 24px rgba(0,0,0,.25)" },
  itemStyle: { color: "hsl(var(--ink))", fontWeight: 600 },
  labelStyle: { color: "hsl(var(--muted))", marginBottom: 2 },
};
export const Empty = () => <p className="grid h-48 place-items-center text-sm text-muted">No data for this period yet.</p>;

export function Donut({ data, centre }: { data: Slice[]; centre?: string }) {
  if (!data.length) return <Empty />;
  const total = data.reduce((s, d) => s + d.valuePaise, 0);
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer><PieChart><Pie data={rs(data)} dataKey="value" innerRadius="62%" outerRadius="100%" paddingAngle={2} stroke="none">
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip {...tipProps} /></PieChart></ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><p className="text-xs text-muted">{centre ?? "Total"}</p><p className="font-bold">{formatINR(total)}</p></div></div>
      </div>
      <ul className="min-w-[10rem] flex-1 space-y-1.5 text-sm">
        {data.map((d, i) => <li key={d.name} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
          <span className="flex-1 truncate">{d.name}</span><span className="text-muted">{Math.round((d.valuePaise / total) * 100)}%</span></li>)}
      </ul>
    </div>
  );
}
export function Bars({ data, horizontal }: { data: Slice[]; horizontal?: boolean }) {
  if (!data.length) return <Empty />;
  return <div style={{ height: horizontal ? Math.max(180, data.length * 40) : 240 }}><ResponsiveContainer>
    <BarChart data={rs(data)} layout={horizontal ? "vertical" : "horizontal"} margin={{ left: horizontal ? 24 : 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#8a948633" vertical={false} />
      {horizontal ? <><XAxis type="number" tick={tick} /><YAxis type="category" dataKey="name" tick={tick} width={80} /></> : <><XAxis dataKey="name" tick={tick} /><YAxis tick={tick} width={48} /></>}
      <Tooltip {...tipProps} cursor={{ fill: "#8a948622" }} />
      <Bar dataKey="value" name="Amount" radius={8}>{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
    </BarChart></ResponsiveContainer></div>;
}
export function Trend({ data }: { data: Slice[] }) {
  if (!data.length) return <Empty />;
  return <div className="h-60"><ResponsiveContainer><LineChart data={rs(data)}><CartesianGrid strokeDasharray="3 3" stroke="#8a948633" vertical={false} />
    <XAxis dataKey="name" tick={tick} tickFormatter={(d: string) => d.slice(5)} /><YAxis tick={tick} width={48} /><Tooltip {...tipProps} />
    <Line type="monotone" dataKey="value" name="Spent" stroke="#5b8a2b" strokeWidth={3} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div>;
}

/** Paid vs share side by side. Advances and settlements are deliberately not part of this chart. */
export function PaidVsShare({ data }: { data: { name: string; paidPaise: number; sharePaise: number }[] }) {
  if (!data.length) return <Empty />;
  const d = data.map((x) => ({ name: x.name, Paid: x.paidPaise / 100, Share: x.sharePaise / 100 })); // display only
  return <div className="h-64"><ResponsiveContainer><BarChart data={d}><CartesianGrid strokeDasharray="3 3" stroke="#8a948633" vertical={false} />
    <XAxis dataKey="name" tick={tick} /><YAxis tick={tick} width={48} /><Tooltip {...tipProps} cursor={{ fill: "#8a948622" }} />
    <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span style={{ color: "hsl(var(--ink))" }}>{v}</span>} />
    <Bar dataKey="Paid" fill="#5b8a2b" radius={6} /><Bar dataKey="Share" fill="#e0a21b" radius={6} /></BarChart></ResponsiveContainer></div>;
}
