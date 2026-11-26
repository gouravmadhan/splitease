import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Merge, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { fmtDate, today, useSave } from "@/lib/hooks";
import { formatINR, rupeesToPaise } from "@/lib/money";
import type { Balances } from "@/lib/types";
import { BalanceBadge, Card, Switch } from "@/components/ui/extra";
import { Button, Field, Modal, inputCls } from "@/components/ui/ui";

const useBalances = (g: string) => useQuery({ queryKey: ["balances", g], queryFn: () => api<Balances>(`/groups/${g}/balances`) });

export function BalancesView({ groupId, onOpenSettle }: { groupId: string; onOpenSettle?: () => void }) {
  const { data } = useBalances(groupId);
  if (!data) return <p className="text-muted">Loading...</p>;
  return (
    <div className="space-y-3">
      <Card>
        <ul className="divide-y divide-line">{data.rows.map((r) => (
          <li key={r.memberId} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1"><p className="font-medium">{r.name}</p>
              <p className="text-xs text-muted">Share {formatINR(r.sharePaise)}, advance {formatINR(r.advancePaise)}, paid {formatINR(r.paidPaise)}</p></div>
            <BalanceBadge paise={r.balancePaise} />
          </li>))}
          {!data.rows.length && <li className="py-4 text-center text-sm text-muted">Add members to see balances.</li>}</ul>
      </Card>
      {data.rows.some((r) => r.balancePaise !== 0) && (onOpenSettle
        ? <Button variant="soft" className="w-full py-3" onClick={onOpenSettle}><Merge size={16} /> Simplify debts ({data.plan.simplifiedCount} payment{data.plan.simplifiedCount === 1 ? "" : "s"})</Button>
        : <Link to={`/settlements?g=${groupId}`} className="flex items-center justify-center gap-2 rounded-chip bg-pill py-3 text-sm font-semibold text-pill-fg"><Merge size={16} /> Simplify debts ({data.plan.simplifiedCount} payment{data.plan.simplifiedCount === 1 ? "" : "s"})</Link>)}
      {data.poolRemainingPaise !== 0 && <Card className="bg-pill text-pill-fg"><p className="text-sm">Pool cash remaining</p><p className="text-2xl font-bold">{formatINR(data.poolRemainingPaise)}</p>
        <p className="text-xs opacity-80">Unspent advances. The holder returns this to the people who get money.</p></Card>}
      <p className="px-2 text-xs text-muted">Balance = share − advances − paid by them − settlements paid + settlements received. Pays means they owe; Gets means they receive.</p>
    </div>
  );
}

type Preset = { from: string; to: string; amountPaise: number } | null;
function SettleModal({ groupId, open, onClose, preset, people }: { groupId: string; open: boolean; onClose: () => void; preset: Preset; people: { id: string; name: string }[] }) {
  const [from, setFrom] = useState(preset?.from ?? people[0]?.id ?? ""); const [to, setTo] = useState(preset?.to ?? people[1]?.id ?? "");
  const [amt, setAmt] = useState(preset ? String(preset.amountPaise / 100) : ""); const [note, setNote] = useState("");
  const [key] = useState(() => crypto.randomUUID()); const [warn, setWarn] = useState("");
  const save = useSave(() => api(`/groups/${groupId}/settlements`, { method: "POST", body: JSON.stringify({ fromMemberId: from, toMemberId: to, amountPaise: rupeesToPaise(amt), date: today(), note: note || undefined, idempotencyKey: key }) }),
    [], (r) => { if (r.warning) { setWarn(r.warning); setTimeout(onClose, 1800); } else onClose(); });
  const sel = (v: string, set: (x: string) => void, l: string) => <Field label={l}><select className={inputCls} value={v} onChange={(e) => set(e.target.value)}>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>;
  return <Modal open={open} onClose={onClose} title="Record payment"><div className="space-y-4">
    {sel(from, setFrom, "Who paid")}{sel(to, setTo, "Who received")}
    <Field label="Amount in ₹ (partial is fine)"><input className={inputCls} inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} /></Field>
    <Field label="Note (optional)"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
    {preset && amt && <p className="text-sm text-muted">Remaining on this suggestion after this payment: <span className="font-semibold text-ink">{formatINR(Math.max(0, preset.amountPaise - rupeesToPaise(amt)))}</span></p>}
    {warn && <p className="rounded-chip bg-pay-bg p-3 text-sm text-pay">Saved. {warn}</p>}
    {save.error && <p className="text-sm text-pay">{(save.error as Error).message}</p>}
    <Button className="w-full py-3" disabled={save.isPending || !amt} onClick={() => save.mutate(undefined)}>Record payment</Button></div></Modal>;
}

export function SettlementsView({ groupId }: { groupId: string }) {
  const { data } = useBalances(groupId);
  const [simplify, setSimplify] = useState(() => { try { return localStorage.getItem("simplifyDebts") !== "off"; } catch { return true; } });
  const flip = () => { const v = !simplify; setSimplify(v); try { localStorage.setItem("simplifyDebts", v ? "on" : "off"); } catch {} };
  const [dlg, setDlg] = useState<{ preset: Preset } | null>(null);
  const del = useSave((id: string) => api(`/settlements/${id}`, { method: "DELETE" }));
  if (!data) return <p className="text-muted">Loading...</p>;
  const people = data.rows.map((r) => ({ id: r.memberId, name: r.name }));
  const list = simplify ? data.simplified : data.suggestions;
  const { plan } = data;
  const saved = plan.standardCount - plan.simplifiedCount;
  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="font-semibold">Simplify debts</h2>
            <p className="text-xs text-muted">{simplify ? "Fewest possible payments" : "Standard plan (largest pays largest)"}</p></div>
          <Switch on={simplify} onChange={flip} label="Simplify debts" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-chip bg-page/50 p-3"><p className="text-xs text-muted">To settle</p><p className="font-bold">{formatINR(plan.totalToSettlePaise)}</p></div>
          <div className="rounded-chip bg-page/50 p-3"><p className="text-xs text-muted">Payments</p><p className="font-bold">{list.length}</p></div>
          <div className="rounded-chip bg-page/50 p-3"><p className="text-xs text-muted">Settled so far</p><p className="font-bold">{formatINR(plan.settledPaise)}</p></div>
        </div>
        {simplify && saved > 0 && <p className="mt-3 text-sm font-medium text-receive">Saves {saved} payment{saved === 1 ? "" : "s"}: {plan.standardCount} in the standard plan, {plan.simplifiedCount} simplified.</p>}
        {!simplify && saved > 0 && <p className="mt-3 text-sm text-muted">Turn on Simplify debts to cut this from {plan.standardCount} to {plan.simplifiedCount} payments.</p>}
        {data.poolRemainingPaise > 0 && <p className="mt-2 text-xs text-muted">{formatINR(data.poolRemainingPaise)} of unspent advances is returned from the advance pool and is not part of these payments.</p>}
      </Card>
      <Card>
        <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Suggested payments</h2>
          <Button variant="soft" disabled={people.length < 2} onClick={() => setDlg({ preset: null })}>Record payment</Button></div>
        <p className="mb-1 text-xs text-muted">Suggestions only. Nothing is recorded until you confirm each payment.</p>
        {!list.length && <p className="py-4 text-center text-sm text-muted">Everyone is settled.</p>}
        <ul className="divide-y divide-line">{list.map((s) => (
          <li key={s.fromMemberId + s.toMemberId} className="flex items-center gap-3 py-3"><p className="min-w-0 flex-1"><span className="font-medium">{s.fromName}</span> pays <span className="font-medium">{s.toName}</span>
            <span className="block font-bold text-pay">{formatINR(s.amountPaise)}</span></p>
            <Button onClick={() => setDlg({ preset: { from: s.fromMemberId, to: s.toMemberId, amountPaise: s.amountPaise } })}>Record</Button></li>))}</ul>
      </Card>
      <Card><h2 className="mb-2 font-semibold">Settlement history</h2>
        {!data.settlements.length && <p className="py-3 text-center text-sm text-muted">No payments recorded.</p>}
        <ul className="divide-y divide-line">{data.settlements.map((s) => (
          <li key={s._id} className="flex items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="truncate">{s.fromName} paid {s.toName}</p><p className="text-xs text-muted">{fmtDate(s.date)}{s.note ? `, ${s.note}` : ""}</p></div>
            <p className="font-bold">{formatINR(s.amountPaise)}</p>
            <button aria-label="Delete settlement" onClick={() => confirm("Delete this payment? Balances will update.") && del.mutate(s._id)} className="grid h-9 w-9 place-items-center rounded-full text-pay"><Trash2 size={16} /></button></li>))}</ul></Card>
      {dlg && <SettleModal key={JSON.stringify(dlg.preset)} groupId={groupId} open onClose={() => setDlg(null)} preset={dlg.preset} people={people} />}
    </div>
  );
}
