import type { Ledger } from "./balance.js";
const s = (x: unknown) => String(x);

/** Raw DB documents -> the Ledger shape the balance engine understands. Pure, so it is reused for filtered views. */
export function buildLedger(members: any[], expenses: any[], advances: any[], settlements: any[]): Ledger {
  return {
    members: members.map((m) => ({ id: s(m._id), name: m.name, isActive: m.isActive })),
    expenses: expenses.map((e) => ({ amountPaise: e.amountPaise, paidBy: e.paidBy, paidByMemberId: e.paidByMemberId && s(e.paidByMemberId),
      shares: e.shares.map((x: any) => ({ memberId: s(x.memberId), sharePaise: x.sharePaise })) })),
    advances: advances.map((a) => ({ memberId: s(a.memberId), amountPaise: a.amountPaise })),
    settlements: settlements.map((x) => ({ fromMemberId: s(x.fromMemberId), toMemberId: s(x.toMemberId), amountPaise: x.amountPaise })),
  };
}
