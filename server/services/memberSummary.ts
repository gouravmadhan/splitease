import { computeBalances } from "./balance.js";
import { buildLedger } from "./ledgerBuild.js";

/**
 * Member-wise summary. All money comes from the existing balance engine (computeBalances).
 * Four separate figures, never merged: paid (member-paid expenses), share, advances, settlements.
 * Date range / category narrow paid, share, advances (date only) and settlements (date only).
 * Net balance is always the member's real overall balance, so it is never distorted by a filter.
 */
export type Raw = { members: any[]; expenses: any[]; advances: any[]; settlements: any[] };
type Range = { $gte?: Date; $lte?: Date } | undefined;
export type Opts = { range?: Range; category?: string };
const id = (x: unknown) => String(x);
const inRange = (d: unknown, r?: Range) => !r || ((!r.$gte || +new Date(d as string) >= +r.$gte) && (!r.$lte || +new Date(d as string) <= +r.$lte));
const byDateDesc = (a: { date: unknown }, b: { date: unknown }) => +new Date(b.date as string) - +new Date(a.date as string);

function narrow(raw: Raw, o: Opts) {
  return {
    expenses: raw.expenses.filter((e) => inRange(e.date, o.range) && (!o.category || e.category === o.category)),
    advances: raw.advances.filter((a) => inRange(a.date, o.range)),
    settlements: raw.settlements.filter((s) => inRange(s.date, o.range)),
  };
}

export function summarizeMembers(raw: Raw, o: Opts = {}) {
  const f = narrow(raw, o);
  const overall = computeBalances(buildLedger(raw.members, raw.expenses, raw.advances, raw.settlements)).rows;
  const part = new Map(computeBalances(buildLedger(raw.members, f.expenses, f.advances, f.settlements)).rows.map((r) => [r.memberId, r]));
  const counts = new Map<string, number>();
  for (const e of f.expenses) {
    const ids = new Set<string>(e.shares.map((x: any) => id(x.memberId)));
    if (e.paidByMemberId) ids.add(id(e.paidByMemberId));
    ids.forEach((m) => counts.set(m, (counts.get(m) ?? 0) + 1));
  }
  const members = overall.map((r) => {
    const p = part.get(r.memberId);
    return { memberId: r.memberId, name: r.name, paidPaise: p?.paidPaise ?? 0, sharePaise: p?.sharePaise ?? 0, advancePaise: p?.advancePaise ?? 0,
      settledOutPaise: p?.settledOutPaise ?? 0, settledInPaise: p?.settledInPaise ?? 0, netPaise: r.balancePaise, expenseCount: counts.get(r.memberId) ?? 0 };
  });
  return { members, totals: { expenseCount: f.expenses.length, paidPaise: members.reduce((t, m) => t + m.paidPaise, 0), sharePaise: members.reduce((t, m) => t + m.sharePaise, 0) } };
}

export function memberDetail(raw: Raw, memberId: string, o: Opts = {}) {
  const row = summarizeMembers(raw, o).members.find((m) => m.memberId === memberId);
  if (!row) return null;
  const f = narrow(raw, o);
  const names = new Map(raw.members.map((m) => [id(m._id), m.name as string]));
  const lines = f.expenses
    .filter((e) => (e.paidByMemberId && id(e.paidByMemberId) === memberId) || e.shares.some((x: any) => id(x.memberId) === memberId))
    .map((e) => ({
      id: id(e._id), title: e.title, date: e.date, category: e.category, totalPaise: e.amountPaise, paidFromPool: e.paidBy === "pool",
      paidPaise: e.paidByMemberId && id(e.paidByMemberId) === memberId ? e.amountPaise : 0,
      sharePaise: e.shares.find((x: any) => id(x.memberId) === memberId)?.sharePaise ?? 0,
    })).sort(byDateDesc);
  const cat = new Map<string, { name: string; paidPaise: number; sharePaise: number }>();
  for (const l of lines) {
    const c = cat.get(l.category) ?? { name: l.category, paidPaise: 0, sharePaise: 0 };
    c.paidPaise += l.paidPaise; c.sharePaise += l.sharePaise; cat.set(l.category, c);
  }
  return {
    member: row,
    contributedPaise: row.paidPaise + row.advancePaise, // paid for expenses + advances, shown separately in the UI
    lines,
    categories: [...cat.values()].sort((a, b) => b.sharePaise - a.sharePaise),
    advances: f.advances.filter((a) => id(a.memberId) === memberId).map((a) => ({ id: id(a._id), date: a.date, amountPaise: a.amountPaise, note: a.note })).sort(byDateDesc),
    settlements: f.settlements.filter((s) => id(s.fromMemberId) === memberId || id(s.toMemberId) === memberId).map((s) => {
      const paid = id(s.fromMemberId) === memberId;
      return { id: id(s._id), date: s.date, direction: paid ? "paid" : "received", otherName: names.get(id(paid ? s.toMemberId : s.fromMemberId)) ?? "Former member", amountPaise: s.amountPaise, note: s.note };
    }).sort(byDateDesc),
  };
}
