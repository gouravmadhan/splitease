import { Member, Expense, Advance, Settlement } from "../models";
import type { Ledger } from "./balance";
const s = (x: unknown) => String(x);

export async function loadLedger(groupId: string) {
  const [members, expenses, advances, settlements] = await Promise.all([
    Member.find({ groupId }).lean(), Expense.find({ groupId }).sort({ date: -1, createdAt: -1 }).lean(),
    Advance.find({ groupId }).lean(), Settlement.find({ groupId }).sort({ date: -1, createdAt: -1 }).lean(),
  ]) as any[][];
  const ledger: Ledger = {
    members: members.map((m) => ({ id: s(m._id), name: m.name, isActive: m.isActive })),
    expenses: expenses.map((e) => ({ amountPaise: e.amountPaise, paidBy: e.paidBy, paidByMemberId: e.paidByMemberId && s(e.paidByMemberId),
      shares: e.shares.map((x: any) => ({ memberId: s(x.memberId), sharePaise: x.sharePaise })) })),
    advances: advances.map((a) => ({ memberId: s(a.memberId), amountPaise: a.amountPaise })),
    settlements: settlements.map((x) => ({ fromMemberId: s(x.fromMemberId), toMemberId: s(x.toMemberId), amountPaise: x.amountPaise })),
  };
  return { ledger, members, expenses, settlements };
}
