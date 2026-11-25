import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useGroups } from "@/lib/hooks";
import { CATEGORIES, type Slice } from "@/lib/types";
import { Card, GroupSelect } from "@/components/ui/extra";
import { inputCls } from "@/components/ui/ui";
import { Bars, Donut, Trend } from "@/components/charts/charts";

type A = { byMember: Slice[]; paidByMember: Slice[]; byCategory: Slice[]; overTime: Slice[]; byGroup: Slice[] };
const C = ({ t, children }: { t: string; children: ReactNode }) => <Card><h2 className="mb-3 font-semibold">{t}</h2>{children}</Card>;

export default function Reports() {
  const { data: groups } = useGroups();
  const [g, setG] = useState(""); const [cat, setCat] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const qs = new URLSearchParams(Object.entries({ groupId: g, category: cat, from, to }).filter(([, v]) => v)).toString();
  const { data } = useQuery({ queryKey: ["analytics", qs], queryFn: () => api<A>(`/analytics?${qs}`) });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Reports & analytics</h1>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <GroupSelect all groups={groups ?? []} value={g} onChange={setG} />
        <select aria-label="Category" className={inputCls} value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        <input aria-label="From date" type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
        <input aria-label="To date" type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      {data && <div className="grid gap-4 lg:grid-cols-2">
        <C t="Share of expenses by member"><Donut data={data.byMember} /></C>
        <C t="Paid by each member"><Bars data={data.paidByMember} /></C>
        <C t="Expenses over time"><Trend data={data.overTime} /></C>
        <C t="By category"><Bars horizontal data={data.byCategory} /></C>
        {!g && <C t="Group comparison"><Bars data={data.byGroup} /></C>}
      </div>}
    </div>
  );
}
