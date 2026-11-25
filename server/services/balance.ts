/**
 * Balance = Share − Advances − Paid by them − Settlements paid + Settlements received
 * (+ = pays, − = receives). Pure functions: nothing is stored, so nothing can be double counted.
 */
export type Ledger = {
  members: { id: string; name: string; isActive?: boolean }[];
  expenses: { amountPaise: number; paidBy: "member" | "pool"; paidByMemberId?: string; shares: { memberId: string; sharePaise: number }[] }[];
  advances: { memberId: string; amountPaise: number }[];
  settlements: { fromMemberId: string; toMemberId: string; amountPaise: number }[];
};
export type MemberBalance = {
  memberId: string; name: string; sharePaise: number; advancePaise: number; paidPaise: number;
  settledOutPaise: number; settledInPaise: number; balancePaise: number;
};

export function computeBalances(l: Ledger) {
  const m = new Map<string, MemberBalance>();
  for (const x of l.members) m.set(x.id, { memberId: x.id, name: x.name, sharePaise: 0, advancePaise: 0, paidPaise: 0, settledOutPaise: 0, settledInPaise: 0, balancePaise: 0 });
  const get = (id: string) => m.get(id) ?? (() => { throw new Error(`Unknown member ${id}`); })();
  let total = 0, poolSpent = 0, advTotal = 0;
  for (const e of l.expenses) {
    total += e.amountPaise;
    for (const s of e.shares) get(s.memberId).sharePaise += s.sharePaise;
    if (e.paidBy === "member" && e.paidByMemberId) get(e.paidByMemberId).paidPaise += e.amountPaise;
    else poolSpent += e.amountPaise;
  }
  for (const a of l.advances) { get(a.memberId).advancePaise += a.amountPaise; advTotal += a.amountPaise; }
  for (const s of l.settlements) { get(s.fromMemberId).settledOutPaise += s.amountPaise; get(s.toMemberId).settledInPaise += s.amountPaise; }
  const active = new Set(l.members.filter((x) => x.isActive !== false).map((x) => x.id));
  const rows = [...m.values()].map((r) => ({ ...r, balancePaise: r.sharePaise - r.advancePaise - r.paidPaise - r.settledOutPaise + r.settledInPaise }))
    .filter((r) => active.has(r.memberId) || r.balancePaise !== 0);
  // Unspent advance cash. Balances of everyone always add up to minus this amount.
  return { rows, poolRemainingPaise: advTotal - poolSpent, totalExpensesPaise: total };
}

/** Greedy: biggest payer pays biggest receiver. At most n−1 payments. Creditors left over are covered by pool cash. */
export function suggestSettlements(rows: { memberId: string; balancePaise: number }[]) {
  const debtors = rows.filter((r) => r.balancePaise > 0).map((r) => ({ id: r.memberId, amt: r.balancePaise }));
  const creditors = rows.filter((r) => r.balancePaise < 0).map((r) => ({ id: r.memberId, amt: -r.balancePaise }));
  const out: { fromMemberId: string; toMemberId: string; amountPaise: number }[] = [];
  while (debtors.length && creditors.length) {
    debtors.sort((a, b) => b.amt - a.amt); creditors.sort((a, b) => b.amt - a.amt);
    const d = debtors[0], c = creditors[0], pay = Math.min(d.amt, c.amt);
    out.push({ fromMemberId: d.id, toMemberId: c.id, amountPaise: pay });
    d.amt -= pay; c.amt -= pay;
    if (!d.amt) debtors.shift();
    if (!c.amt) creditors.shift();
  }
  return out;
}
