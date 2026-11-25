import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ChevronRight, Layers, Star, TrendingUp, Users } from "lucide-react";
import { api } from "@/lib/api";
import { fmtDate, useActiveGroup, useScope, useSetActive } from "@/lib/hooks";
import { formatINR } from "@/lib/money";
import { useWidgets } from "@/lib/widgets";
import type { HistoryItem, Slice } from "@/lib/types";
import { Card } from "@/components/ui/extra";
import { Bars, Donut } from "@/components/charts/charts";
import Ring from "@/components/charts/Ring";
import ExpenseEditSheet from "@/features/expenses/ExpenseEditSheet";
import { cn } from "@/lib/cn";

type Sug = { groupId: string; groupName: string; fromName: string; toName: string; amountPaise: number };
type Dash = { groupCount: number; memberCount: number; totalExpensesPaise: number; paidPaise: number; owePaise: number; owedPaise: number; netPaise: number; hasMe: boolean; suggestions: Sug[]; recent: HistoryItem[] };
type A = { byCategory: Slice[]; paidByMember: Slice[] };
const pill = (on: boolean) => cn("flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors", on ? "bg-primary text-primary-fg" : "bg-card text-muted hover:text-ink");
const TONE = { pay: "bg-pay-bg text-pay", receive: "bg-receive-bg text-receive", neutral: "bg-pill text-pill-fg" };

function StatPill({ label, value, tone, icon: Icon }: { label: string; value: string; tone: keyof typeof TONE; icon: typeof ArrowUp }) {
  return (
    <div className="flex items-center gap-3 rounded-card bg-card px-3 py-3 sm:px-4">
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", TONE[tone])}><Icon size={18} /></span>
      <div className="min-w-0"><p className="truncate text-xs text-muted">{label}</p>
        <p className={cn("truncate text-base font-bold sm:text-lg", tone === "pay" && "text-pay", tone === "receive" && "text-receive")}>{value}</p></div>
    </div>
  );
}

export default function Dashboard() {
  const { groups, active } = useActiveGroup();
  const [scope, setScope] = useScope();
  const setActive = useSetActive();
  const { on } = useWidgets();
  const [editId, setEditId] = useState<string | null>(null);
  const all = scope === "all";
  const groupId = all ? "" : active?._id ?? "";
  const ready = !!groups?.length && (all || !!active);
  const qs = groupId ? `?groupId=${groupId}` : "";
  const { data: d, error } = useQuery({ queryKey: ["dashboard", groupId], enabled: ready, queryFn: () => api<Dash>(`/dashboard${qs}`) });
  const needCharts = on("categories") || on("members");
  const { data: a } = useQuery({ queryKey: ["analytics", "dash", groupId], enabled: ready && needCharts, queryFn: () => api<A>(`/analytics${qs}`) });

  if (groups && !groups.length) return (
    <div className="space-y-4"><h1 className="text-2xl font-bold">Dashboard</h1>
      <Card className="py-10 text-center"><p className="font-semibold">No groups yet</p><Link to="/groups" className="mt-3 inline-block rounded-chip bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg">Create your first group</Link></Card></div>);

  const stats = d ? ([
    { k: "totalExpenses", label: "Total expenses", value: formatINR(d.totalExpensesPaise), tone: "pay", icon: ArrowDown },
    { k: "paid", label: "Paid by me", value: formatINR(d.paidPaise), tone: "receive", icon: ArrowUp },
    { k: "owe", label: "I owe", value: formatINR(d.owePaise), tone: "pay", icon: ArrowDown },
    { k: "owed", label: "Owed to me", value: formatINR(d.owedPaise), tone: "receive", icon: ArrowUp },
    { k: "count", label: all ? "Groups" : "Members", value: String(all ? d.groupCount : d.memberCount), tone: "neutral", icon: all ? Layers : Users },
  ] as const).filter((s) => on(s.k)) : [];
  const showInsights = on("insights");
  const hasRight = stats.length > 0 || showInsights;
  const anyOn = on("ring") || hasRight || on("categories") || on("members") || on("settle") || on("recent");

  const right = (
    <div className="flex flex-col gap-3 [&>*]:flex-1">
      {stats.map((s) => <StatPill key={s.k} label={s.label} value={s.value} tone={s.tone} icon={s.icon} />)}
      {showInsights && <Link to="/reports" className="flex items-center gap-3 rounded-card bg-card px-3 py-3 font-semibold sm:px-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pill text-pill-fg"><TrendingUp size={18} /></span>
        <span className="flex-1">Insights</span><ChevronRight size={18} className="text-muted" /></Link>}
    </div>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div>
        <div role="group" aria-label="Choose group" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          {groups?.map((g) => {
            const isActive = active?._id === g._id, sel = !all && isActive;
            return <button key={g._id} aria-pressed={sel} onClick={() => { setScope("active"); if (!isActive) setActive.mutate(g._id); }}
              className={cn(pill(sel), !sel && isActive && "ring-2 ring-primary/50")}>{g.emoji} {g.name}{isActive && <Star size={12} className="fill-current" aria-label="Active group" />}</button>;
          })}
          <button aria-pressed={all} onClick={() => setScope("all")} className={pill(all)}>All groups</button>
        </div>
        <p className="mt-1 px-1 text-xs text-muted">{all ? "Combined across all groups" : `Showing ${active?.name}, your active group`}</p>
      </div>

      {error && <p className="rounded-card bg-pay-bg p-4 text-pay">{(error as Error).message}. Check MONGODB_URI and the passcode in Settings.</p>}
      {!d && !error && <p className="text-muted">Loading...</p>}
      {d && <>
        {!anyOn && <Card className="py-8 text-center text-sm text-muted">All widgets are hidden. Turn some on in <Link to="/settings" className="font-semibold text-primary">Settings</Link>.</Card>}

        {(on("ring") || hasRight) && (
          <div className={cn("grid gap-3", on("ring") && hasRight ? "grid-cols-2 lg:grid-cols-[2fr_3fr]" : "grid-cols-1")}>
            {on("ring") && (
              <Card className="flex items-center justify-center p-3 sm:p-5">
                <Ring owe={d.owePaise} owed={d.owedPaise}
                  value={d.hasMe ? formatINR(Math.abs(d.netPaise)) : "Not set"}
                  sub={!d.hasMe ? "Choose “You are”" : d.netPaise > 0 ? "You pay" : d.netPaise < 0 ? "You get" : "Settled"}
                  subTone={!d.hasMe ? "muted" : d.netPaise > 0 ? "pay" : d.netPaise < 0 ? "receive" : "muted"} />
              </Card>)}
            {hasRight && right}
          </div>)}
        {on("ring") && !d.hasMe && <p className="px-1 text-xs text-muted">Open a group, go to Members and choose "You are" to see your personal totals.</p>}

        {(on("categories") || on("members")) && (
          <div className="grid gap-4 lg:grid-cols-2">
            {on("categories") && <Card><h2 className="mb-3 font-semibold">Where it went</h2><Donut data={a?.byCategory ?? []} centre="Spent" /></Card>}
            {on("members") && <Card><h2 className="mb-3 font-semibold">Member-wise spending</h2><Bars data={a?.paidByMember ?? []} /></Card>}
          </div>)}

        {on("settle") && (
          <Card>
            <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Settlement summary</h2>
              <Link to={groupId ? `/settlements?g=${groupId}` : "/settlements"} className="text-sm font-semibold text-primary">Open</Link></div>
            {!d.suggestions.length && <p className="py-3 text-center text-sm text-muted">Everyone is settled.</p>}
            <ul className="divide-y divide-line">{d.suggestions.map((s, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5 text-sm"><p className="min-w-0 flex-1 truncate"><span className="font-medium">{s.fromName}</span> pays <span className="font-medium">{s.toName}</span>{all && <span className="text-muted">, {s.groupName}</span>}</p>
                <p className="font-bold text-pay">{formatINR(s.amountPaise)}</p></li>))}</ul>
          </Card>)}

        {on("recent") && (
          <Card>
            <div className="mb-1 flex items-center justify-between"><h2 className="font-semibold">Recent transactions</h2><Link to="/history" className="text-sm font-semibold text-primary">View all</Link></div>
            {!d.recent.length && <p className="py-4 text-center text-sm text-muted">Nothing yet. Tap + to add an expense.</p>}
            <ul className="space-y-0.5">{d.recent.map((r) => {
              const click = r.type === "expense";
              return <li key={r.type + r.id}>
                <div role={click ? "button" : undefined} tabIndex={click ? 0 : undefined} aria-label={click ? `Edit ${r.title}` : undefined}
                  onClick={click ? () => setEditId(r.id) : undefined}
                  onKeyDown={click ? (k) => (k.key === "Enter" || k.key === " ") && (k.preventDefault(), setEditId(r.id)) : undefined}
                  className={cn("-mx-2 flex items-center gap-3 rounded-chip px-2 py-3", click && "cursor-pointer transition-colors hover:bg-page/60 focus-visible:bg-page/60")}>
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{r.title}</p>
                    <p className="truncate text-xs text-muted">{r.detail || r.type}, {fmtDate(r.date)}{all && `, ${r.groupName}`}</p></div>
                  <p className={cn("font-bold", r.type === "expense" ? "text-pay" : "text-receive")}>{r.type === "expense" ? "-" : "+"}{formatINR(r.amountPaise)}</p>
                </div></li>; })}</ul>
          </Card>)}
      </>}
      <ExpenseEditSheet expenseId={editId} onClose={() => setEditId(null)} />
    </div>
  );
}
