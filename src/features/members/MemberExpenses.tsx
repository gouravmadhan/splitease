import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/hooks";
import { formatINR } from "@/lib/money";
import { CATEGORIES, type MemberSummary } from "@/lib/types";
import { BalanceBadge, Card } from "@/components/ui/extra";
import { inputCls } from "@/components/ui/ui";
import { Bars, Donut, PaidVsShare } from "@/components/charts/charts";
import ExpenseEditSheet from "@/features/expenses/ExpenseEditSheet";

const Mini = ({ label, value }: { label: string; value: string }) => <div className="rounded-chip bg-page/50 p-3"><p className="text-xs text-muted">{label}</p><p className="font-bold">{value}</p></div>;

export default function MemberExpenses({ groupId }: { groupId: string }) {
  const [f, setF] = useState({ from: "", to: "", category: "", memberId: "" });
  const [openId, setOpenId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const base = new URLSearchParams(Object.entries({ from: f.from, to: f.to, category: f.category }).filter(([, v]) => v)).toString();
  const qs = openId ? `${base}${base ? "&" : ""}memberId=${openId}` : base;
  const { data, error } = useQuery({ queryKey: ["member-summary", groupId, qs], queryFn: () => api<MemberSummary>(`/groups/${groupId}/member-summary${qs ? `?${qs}` : ""}`) });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const filters = (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <input aria-label="From date" type="date" className={inputCls} value={f.from} onChange={set("from")} />
      <input aria-label="To date" type="date" className={inputCls} value={f.to} onChange={set("to")} />
      <select aria-label="Category" className={inputCls} value={f.category} onChange={set("category")}><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
      {!openId && <select aria-label="Member" className={inputCls} value={f.memberId} onChange={set("memberId")}><option value="">All members</option>{data?.members.map((m) => <option key={m.memberId} value={m.memberId}>{m.name}</option>)}</select>}
    </div>
  );
  if (error) return <p className="rounded-card bg-pay-bg p-4 text-pay">{(error as Error).message}</p>;
  if (!data) return <p className="text-muted">Loading...</p>;

  // ---------- one member ----------
  if (openId && data.detail) {
    const d = data.detail, m = d.member;
    return (
      <div className="space-y-3">
        <button onClick={() => setOpenId(null)} className="inline-flex items-center gap-1 text-sm text-muted"><ArrowLeft size={16} /> All members</button>
        <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-full bg-pill text-lg font-semibold text-pill-fg">{m.name[0]?.toUpperCase()}</span>
          <h2 className="min-w-0 flex-1 truncate text-xl font-bold">{m.name}</h2><BalanceBadge paise={m.netPaise} /></div>
        {filters}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Mini label="Total paid" value={formatINR(m.paidPaise)} /><Mini label="Expense share" value={formatINR(m.sharePaise)} />
          <Mini label="Advances" value={formatINR(m.advancePaise)} /><Mini label="Total contributed" value={formatINR(d.contributedPaise)} />
          <Mini label="Settlements paid" value={formatINR(m.settledOutPaise)} /><Mini label="Settlements received" value={formatINR(m.settledInPaise)} />
        </div>
        <p className="px-1 text-xs text-muted">Contributed = paid + advances. Net balance is the member's full overall balance and ignores these filters.</p>
        <Card><h3 className="mb-3 font-semibold">Spending by category</h3>
          <Donut data={d.categories.filter((c) => c.sharePaise > 0).map((c) => ({ name: c.name, valuePaise: c.sharePaise }))} centre="Share" />
          <ul className="mt-3 divide-y divide-line text-sm">{d.categories.map((c) => (
            <li key={c.name} className="flex items-center gap-3 py-2"><span className="flex-1">{c.name}</span><span className="text-muted">Paid {formatINR(c.paidPaise)}</span><span className="w-24 text-right font-semibold">Share {formatINR(c.sharePaise)}</span></li>))}</ul></Card>
        <Card><h3 className="mb-1 font-semibold">Expenses ({d.lines.length})</h3>
          {!d.lines.length && <p className="py-4 text-center text-sm text-muted">No expenses for these filters.</p>}
          <ul className="space-y-0.5">{d.lines.map((l) => (
            <li key={l.id}><div role="button" tabIndex={0} aria-label={`Edit ${l.title}`} onClick={() => setEditId(l.id)} onKeyDown={(k) => (k.key === "Enter" || k.key === " ") && (k.preventDefault(), setEditId(l.id))}
              className="-mx-2 flex cursor-pointer items-center gap-3 rounded-chip px-2 py-3 transition-colors hover:bg-page/60">
              <div className="min-w-0 flex-1"><p className="truncate font-medium">{l.title}</p><p className="truncate text-xs text-muted">{fmtDate(l.date)}, {l.category}, total {formatINR(l.totalPaise)}{l.paidFromPool ? ", from advance pool" : ""}</p></div>
              <div className="text-right text-sm">{l.paidPaise > 0 && <p className="font-semibold text-receive">Paid {formatINR(l.paidPaise)}</p>}<p className="text-muted">Share {formatINR(l.sharePaise)}</p></div>
            </div></li>))}</ul></Card>
        <Card><h3 className="mb-1 font-semibold">Advances</h3>
          {!d.advances.length && <p className="py-3 text-center text-sm text-muted">No advances.</p>}
          <ul className="divide-y divide-line">{d.advances.map((a) => <li key={a.id} className="flex items-center gap-3 py-2.5 text-sm"><span className="flex-1">{fmtDate(a.date)}{a.note ? `, ${a.note}` : ""}</span><span className="font-bold">{formatINR(a.amountPaise)}</span></li>)}</ul></Card>
        <Card><h3 className="mb-1 font-semibold">Settlements</h3>
          {!d.settlements.length && <p className="py-3 text-center text-sm text-muted">No settlements.</p>}
          <ul className="divide-y divide-line">{d.settlements.map((s) => <li key={s.id} className="flex items-center gap-3 py-2.5 text-sm">
            <span className="flex-1">{s.direction === "paid" ? `Paid ${s.otherName}` : `Received from ${s.otherName}`}<span className="block text-xs text-muted">{fmtDate(s.date)}</span></span>
            <span className={`font-bold ${s.direction === "paid" ? "text-pay" : "text-receive"}`}>{formatINR(s.amountPaise)}</span></li>)}</ul></Card>
        <ExpenseEditSheet expenseId={editId} onClose={() => setEditId(null)} />
      </div>
    );
  }

  // ---------- all members ----------
  const rows = f.memberId ? data.members.filter((m) => m.memberId === f.memberId) : data.members;
  const tot = rows.reduce((t, m) => ({ paid: t.paid + m.paidPaise, share: t.share + m.sharePaise }), { paid: 0, share: 0 });
  return (
    <div className="space-y-3">
      {filters}
      <Card className="overflow-x-auto p-3 sm:p-5">
        <table className="w-full min-w-[520px] text-sm">
          <thead><tr className="text-left text-xs text-muted"><th className="pb-2 font-medium">Member</th><th className="pb-2 text-right font-medium">Total paid</th><th className="pb-2 text-right font-medium">Expense share</th><th className="pb-2 text-right font-medium">Net balance</th><th className="pb-2 pl-3 text-right font-medium">Expenses</th></tr></thead>
          <tbody>{rows.map((m) => (
            <tr key={m.memberId} onClick={() => setOpenId(m.memberId)} className="cursor-pointer border-t border-line transition-colors hover:bg-page/60">
              <td className="py-3"><button className="font-medium" onClick={(e) => { e.stopPropagation(); setOpenId(m.memberId); }}>{m.name}</button></td>
              <td className="py-3 text-right font-semibold text-receive">{formatINR(m.paidPaise)}</td>
              <td className="py-3 text-right">{formatINR(m.sharePaise)}</td>
              <td className="py-3 text-right"><BalanceBadge paise={m.netPaise} className="text-xs" /></td>
              <td className="py-3 pl-3 text-right text-muted">{m.expenseCount}</td>
            </tr>))}
            {!rows.length && <tr><td colSpan={5} className="py-6 text-center text-muted">No members yet.</td></tr>}</tbody>
          {rows.length > 0 && <tfoot><tr className="border-t border-line font-bold"><td className="pt-3">Total</td><td className="pt-3 text-right">{formatINR(tot.paid)}</td><td className="pt-3 text-right">{formatINR(tot.share)}</td><td /><td className="pt-3 pl-3 text-right text-muted">{data.totals.expenseCount}</td></tr></tfoot>}
        </table>
      </Card>
      <p className="px-1 text-xs text-muted">Tap a member for their breakdown. Paid is money a member actually paid; expenses paid from the advance pool are not counted as paid by anyone. Net balance always reflects the full group history.</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><h3 className="mb-3 font-semibold">Total paid by member</h3><Bars data={rows.map((m) => ({ name: m.name, valuePaise: m.paidPaise }))} /></Card>
        <Card><h3 className="mb-3 font-semibold">Contribution share</h3><Donut centre="Paid" data={rows.filter((m) => m.paidPaise > 0).map((m) => ({ name: m.name, valuePaise: m.paidPaise }))} /></Card>
        <Card className="lg:col-span-2"><h3 className="mb-3 font-semibold">Paid vs expense share</h3><PaidVsShare data={rows} /></Card>
      </div>
    </div>
  );
}
