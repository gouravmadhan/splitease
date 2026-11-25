import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Delete, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { today, useActiveGroup, useSave } from "@/lib/hooks";
import { formatINR, rupeesToPaise } from "@/lib/money";
import { CATEGORIES, type Expense, type Group, type Member } from "@/lib/types";
import { Button, inputCls } from "@/components/ui/ui";
import { GroupSelect } from "@/components/ui/extra";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { detectCategory } from "@/lib/categorize";

type Props = { expenseId?: string; groupId?: string; onDone: (groupId: string) => void; onCancel?: () => void };
const AMOUNT_RE = /^\d{0,9}(\.\d{0,2})?$/;

/** Add or edit an expense. In edit mode the group is taken from the expense itself. */
export default function ExpenseForm({ expenseId: eid, groupId: initial, onDone, onCancel }: Props) {
  const { groups, active } = useActiveGroup();
  const { data: ex } = useQuery({ queryKey: ["expense", eid], enabled: !!eid, queryFn: () => api<Expense>(`/expenses/${eid}`) });
  const [gid, setGid] = useState(initial ?? "");
  const groupId = eid ? ex?.groupId ?? "" : gid || active?._id || "";
  const { data: gd } = useQuery({ queryKey: ["group", groupId], enabled: !!groupId, queryFn: () => api<{ group: Group; members: Member[] }>(`/groups/${groupId}`) });
  const members = gd?.members ?? [];
  const [f, setF] = useState({ amount: "", title: "", category: "Food", date: today(), paidBy: "", note: "" });
  const [parts, setParts] = useState<string[]>([]);
  // Auto-detect only runs while the user hasn't picked a category by hand. Opening an existing expense never changes its category.
  const [catTouched, setCatTouched] = useState(false);
  const [autoCat, setAutoCat] = useState(false);
  const onTitle = (title: string) => {
    const c = catTouched ? null : detectCategory(title);
    setF((p) => ({ ...p, title, ...(c ? { category: c } : {}) }));
    if (c) setAutoCat(true);
  };
  const [key] = useState(() => crypto.randomUUID());

  useEffect(() => { // new expense defaults: everyone shares, payer = you
    if (eid || !members.length) return;
    setParts(members.map((m) => m._id));
    setF((p) => ({ ...p, paidBy: members.find((m) => m._id === gd?.group.meMemberId)?._id ?? members[0]._id }));
  }, [gd?.group._id, members.length, eid]); // eslint-disable-line
  useEffect(() => { // edit: prefill everything from the saved expense
    if (!ex) return;
    setParts(ex.shares.map((s) => s.memberId));
    setF({ amount: String(ex.amountPaise / 100), title: ex.title, category: ex.category, date: ex.date.slice(0, 10), paidBy: ex.paidBy === "pool" ? "pool" : ex.paidByMemberId!, note: ex.description ?? "" });
  }, [ex]);

  const press = (k: string) => setF((p) => {
    const a = k === "⌫" ? p.amount.slice(0, -1) : p.amount + k;
    return AMOUNT_RE.test(a) ? { ...p, amount: a } : p;
  });
  const save = useSave(() => {
    const body = { title: f.title, amountPaise: rupeesToPaise(f.amount || "0"), category: f.category, date: f.date, paidBy: f.paidBy === "pool" ? "pool" : "member",
      paidByMemberId: f.paidBy === "pool" ? undefined : f.paidBy, participantIds: parts, description: f.note || undefined, idempotencyKey: key };
    return eid ? api(`/expenses/${eid}`, { method: "PATCH", body: JSON.stringify(body) }) : api(`/groups/${groupId}/expenses`, { method: "POST", body: JSON.stringify(body) });
  }, [], () => { toast(eid ? "Expense updated" : "Expense added"); onDone(groupId); });
  const del = useSave(() => api(`/expenses/${eid}`, { method: "DELETE" }), [], () => { toast("Expense deleted"); onDone(groupId); });

  if (eid && !ex) return <p className="py-10 text-center text-muted">Loading expense...</p>;
  const est = parts.length && f.amount ? formatINR(Math.round(rupeesToPaise(f.amount) / parts.length)) : "";
  const toggle = (id: string) => setParts((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  return (
    <div className="space-y-3">
      {!eid && groups && <GroupSelect groups={groups} value={groupId} onChange={setGid} />}
      <input inputMode="none" aria-label="Amount" placeholder="0" value={f.amount}
        onChange={(e) => AMOUNT_RE.test(e.target.value) && setF({ ...f, amount: e.target.value })}
        className="w-full bg-transparent text-center text-5xl font-bold text-pay outline-none placeholder:text-pay/40" />
      <input className={inputCls} placeholder="What was it for? (title)" value={f.title} onChange={(e) => onTitle(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <select aria-label="Category" className={inputCls} value={f.category} onChange={(e) => { setCatTouched(true); setAutoCat(false); setF({ ...f, category: e.target.value }); }}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        <input aria-label="Date" type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
      </div>
      {autoCat && <p className="-mt-1 flex items-center gap-1 px-1 text-xs text-muted"><Sparkles size={12} /> Category auto-detected from the title. Change it if needed.</p>}
      <select aria-label="Paid by" className={inputCls} value={f.paidBy} onChange={(e) => setF({ ...f, paidBy: e.target.value })}>
        {members.map((m) => <option key={m._id} value={m._id}>Paid by {m.name}</option>)}<option value="pool">Paid from advance pool</option></select>
      <div>
        <div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium text-muted">Shared by {parts.length} {est && `(≈ ${est} each)`}</span>
          <button type="button" className="font-semibold text-primary" onClick={() => setParts(parts.length === members.length ? [] : members.map((m) => m._id))}>{parts.length === members.length ? "Clear" : "Select all"}</button></div>
        <div className="flex flex-wrap gap-2">{members.map((m) => (
          <button type="button" key={m._id} aria-pressed={parts.includes(m._id)} onClick={() => toggle(m._id)}
            className={cn("rounded-full px-4 py-2 text-sm font-medium", parts.includes(m._id) ? "bg-primary text-primary-fg" : "bg-page/60 text-muted")}>{m.name}</button>))}</div>
      </div>
      <input className={inputCls} placeholder="Description (optional)" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map((k) => (
          <button type="button" key={k} aria-label={k === "⌫" ? "Backspace" : k} onClick={() => press(k)} className="grid h-14 place-items-center rounded-chip bg-page/60 text-xl font-semibold active:scale-95">{k === "⌫" ? <Delete size={20} /> : k}</button>))}
      </div>
      {save.error && <p className="text-sm text-pay">{(save.error as Error).message}</p>}
      <Button className="w-full py-4 text-base" disabled={save.isPending || !groupId} onClick={() => save.mutate(undefined)}>{eid ? "Save changes" : "Add expense"}</Button>
      {eid && <div className="grid grid-cols-2 gap-2">
        <Button variant="soft" onClick={onCancel}>Cancel</Button>
        <Button variant="danger" disabled={del.isPending} onClick={() => confirm("Delete this expense? Balances will update.") && del.mutate(undefined)}>Delete</Button></div>}
    </div>
  );
}
