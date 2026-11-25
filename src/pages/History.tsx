import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, PiggyBank, Receipt } from "lucide-react";
import { api } from "@/lib/api";
import { fmtDate, useGroups } from "@/lib/hooks";
import { formatINR } from "@/lib/money";
import { CATEGORIES, type HistoryItem, type Member } from "@/lib/types";
import { Card, GroupSelect } from "@/components/ui/extra";
import { inputCls } from "@/components/ui/ui";

const ICON = { expense: Receipt, advance: PiggyBank, settlement: ArrowLeftRight };
export default function History() {
  const { data: groups } = useGroups();
  const [f, setF] = useState({ groupId: "", memberId: "", type: "", category: "", from: "", to: "" });
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
  const { data } = useQuery({ queryKey: ["history", qs], queryFn: () => api<HistoryItem[]>(`/history?${qs}`) });
  const { data: gd } = useQuery({ queryKey: ["group", f.groupId], enabled: !!f.groupId, queryFn: () => api<{ members: Member[] }>(`/groups/${f.groupId}`) });
  const set = (k: string) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value, ...(k === "groupId" ? { memberId: "" } : {}) });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Transaction history</h1>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <GroupSelect all groups={groups ?? []} value={f.groupId} onChange={(v) => setF({ ...f, groupId: v, memberId: "" })} />
        <select aria-label="Member" className={inputCls} value={f.memberId} onChange={set("memberId")} disabled={!f.groupId}><option value="">All members</option>{gd?.members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}</select>
        <select aria-label="Type" className={inputCls} value={f.type} onChange={set("type")}><option value="">All types</option><option value="expense">Expenses</option><option value="advance">Advances</option><option value="settlement">Settlements</option></select>
        <select aria-label="Category" className={inputCls} value={f.category} onChange={set("category")}><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        <input aria-label="From date" type="date" className={inputCls} value={f.from} onChange={set("from")} />
        <input aria-label="To date" type="date" className={inputCls} value={f.to} onChange={set("to")} />
      </div>
      <Card>{data && !data.length && <p className="py-6 text-center text-sm text-muted">No transactions match these filters.</p>}
        <ul className="divide-y divide-line">{data?.map((r) => { const I = ICON[r.type]; return (
          <li key={r.type + r.id} className="flex items-center gap-3 py-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-pill text-pill-fg"><I size={18} /></span>
            <div className="min-w-0 flex-1"><p className="truncate font-medium">{r.title}</p><p className="truncate text-xs text-muted">{r.groupName}, {fmtDate(r.date)}{r.detail ? `, ${r.detail}` : ""}</p></div>
            <p className="font-bold">{formatINR(r.amountPaise)}</p></li>); })}</ul></Card>
    </div>
  );
}
