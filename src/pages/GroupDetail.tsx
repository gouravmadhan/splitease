import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Star, Trash2, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { useActiveGroup, useSave, useSetActive } from "@/lib/hooks";
import { formatINR } from "@/lib/money";
import type { Group, Member } from "@/lib/types";
import { Button, inputCls } from "@/components/ui/ui";
import { Card } from "@/components/ui/extra";
import { cn } from "@/lib/cn";
import GroupForm from "@/features/groups/GroupForm";
import MemberForm from "@/features/groups/MemberForm";
import AdvanceModal from "@/features/groups/AdvanceModal";
import ExpenseList from "@/features/expenses/ExpenseList";
import { BalancesView, SettlementsView } from "@/features/balances/BalancePanels";

const TABS = ["Members", "Expenses", "Balances", "Settle"] as const;

export default function GroupDetail() {
  const { id = "" } = useParams(); const nav = useNavigate();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Expenses");
  const [editGroup, setEditGroup] = useState(false);
  const [memberDlg, setMemberDlg] = useState<{ member?: Member } | null>(null);
  const [advFor, setAdvFor] = useState<Member | null>(null);
  const { data, error } = useQuery({ queryKey: ["group", id], queryFn: () => api<{ group: Group; members: Member[] }>(`/groups/${id}`) });
  const delGroup = useSave(() => api(`/groups/${id}`, { method: "DELETE" }), [], () => nav("/groups"));
  const delMember = useSave((m: string) => api(`/members/${m}`, { method: "DELETE" }));
  const { active } = useActiveGroup(); const setActive = useSetActive();
  const setMe = useSave((v: string) => api(`/groups/${id}`, { method: "PATCH", body: JSON.stringify({ meMemberId: v || null }) }));

  if (error) return <p className="rounded-card bg-pay-bg p-4 text-pay">{(error as Error).message}</p>;
  if (!data) return <p className="text-muted">Loading...</p>;
  const { group, members } = data;
  const advTotal = members.reduce((s, m) => s + m.advanceTotalPaise, 0);

  return (
    <div className="space-y-4">
      <Link to="/groups" className="inline-flex items-center gap-1 text-sm text-muted"><ArrowLeft size={16} /> Groups</Link>
      <div className="flex items-center gap-3">
        <span className="grid h-14 w-14 place-items-center rounded-chip bg-pill text-3xl">{group.emoji ?? "👥"}</span>
        <div className="min-w-0 flex-1"><h1 className="truncate text-2xl font-bold">{group.name}</h1>{group.description && <p className="truncate text-sm text-muted">{group.description}</p>}</div>
        <Button variant="soft" onClick={() => setEditGroup(true)} aria-label="Edit group"><Pencil size={16} /></Button>
        <Button variant="danger" aria-label="Delete group" onClick={() => confirm(`Delete "${group.name}" and all its data? This cannot be undone.`) && delGroup.mutate(undefined)}><Trash2 size={16} /></Button>
      </div>
      {active?._id === id
        ? <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-sm font-semibold text-primary-fg"><Star size={14} className="fill-current" /> Active group</span>
        : <Button variant="soft" onClick={() => setActive.mutate(id)}><Star size={14} /> Set as active group</Button>}
      <div className="grid grid-cols-2 gap-3">
        <Card><p className="text-sm text-muted">Members</p><p className="text-2xl font-bold">{members.length}</p></Card>
        <Card><p className="text-sm text-muted">Advances collected</p><p className="text-2xl font-bold">{formatINR(advTotal)}</p></Card>
      </div>
      <div role="tablist" className="flex gap-1 rounded-full bg-card p-1">{TABS.map((t) => (
        <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("flex-1 rounded-full py-2 text-sm font-medium text-muted", tab === t && "bg-primary text-primary-fg")}>{t}</button>))}</div>

      {tab === "Expenses" && <><Link to={`/expenses/new?g=${id}`} className="flex items-center justify-center gap-2 rounded-chip bg-primary py-3 font-semibold text-primary-fg"><Plus size={18} /> Add expense</Link><ExpenseList groupId={id} /></>}
      {tab === "Balances" && <BalancesView groupId={id} />}
      {tab === "Settle" && <SettlementsView groupId={id} />}
      {tab === "Members" && <>
        <Card>
          <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Members</h2><Button onClick={() => setMemberDlg({})}><Plus size={16} /> Add member</Button></div>
          {!members.length && <p className="py-6 text-center text-sm text-muted">Add the people sharing costs in this group.</p>}
          <ul className="divide-y divide-line">{members.map((m) => (
            <li key={m._id} className="flex items-center gap-3 py-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pill font-semibold text-pill-fg">{m.name[0]?.toUpperCase()}</span>
              <div className="min-w-0 flex-1"><p className="truncate font-medium">{m.name}</p><p className="truncate text-xs text-muted">{m.contact || m.notes || "No contact"}</p></div>
              <button onClick={() => setAdvFor(m)} aria-label={`Advances for ${m.name}`} className="rounded-chip bg-receive-bg px-3 py-1.5 text-sm font-semibold text-receive"><Wallet size={14} className="mr-1 inline" />{formatINR(m.advanceTotalPaise)}</button>
              <button aria-label={`Edit ${m.name}`} onClick={() => setMemberDlg({ member: m })} className="grid h-9 w-9 place-items-center rounded-full text-muted"><Pencil size={16} /></button>
              <button aria-label={`Remove ${m.name}`} onClick={() => confirm(`Remove ${m.name}? Members with history are archived, not erased.`) && delMember.mutate(m._id)} className="grid h-9 w-9 place-items-center rounded-full text-pay"><Trash2 size={16} /></button>
            </li>))}</ul>
        </Card>
        <Card><label className="block space-y-1.5"><span className="text-sm font-medium text-muted">You are (powers your dashboard totals)</span>
          <select className={inputCls} value={group.meMemberId ?? ""} onChange={(e) => setMe.mutate(e.target.value)}><option value="">Not set</option>{members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}</select></label></Card>
      </>}

      <GroupForm key={`g${editGroup}`} open={editGroup} onClose={() => setEditGroup(false)} group={group} />
      <MemberForm key={`m${memberDlg?.member?._id ?? "new"}${!!memberDlg}`} open={!!memberDlg} onClose={() => setMemberDlg(null)} groupId={id} member={memberDlg?.member} />
      <AdvanceModal member={advFor} onClose={() => setAdvFor(null)} />
    </div>
  );
}
