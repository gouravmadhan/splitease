import { Member, Expense, Advance, Settlement } from "../models/index.js";
import { buildLedger } from "./ledgerBuild.js";

export async function loadLedger(groupId: string) {
  const [members, expenses, advances, settlements] = await Promise.all([
    Member.find({ groupId }).lean(), Expense.find({ groupId }).sort({ date: -1, createdAt: -1 }).lean(),
    Advance.find({ groupId }).lean(), Settlement.find({ groupId }).sort({ date: -1, createdAt: -1 }).lean(),
  ]) as any[][];
  return { ledger: buildLedger(members, expenses, advances, settlements), members, expenses, advances, settlements };
}
