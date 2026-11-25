import { Router } from "express";
import { z } from "zod";
import { Group, Member, Expense, Settlement } from "../models/index.js";
import { computeBalances, suggestSettlements } from "../services/balance.js";
import { loadLedger } from "../services/ledger.js";
import { buildHistory, dayRange } from "../services/history.js";
import { wrap, HttpError } from "./util.js";

export const finance = Router();

finance.get("/groups/:gid/balances", wrap(async (req, res) => {
  const { ledger, settlements } = await loadLedger(req.params.gid);
  const c = computeBalances(ledger);
  const name = new Map(ledger.members.map((m) => [m.id, m.name]));
  res.json({
    ...c,
    suggestions: suggestSettlements(c.rows).map((s) => ({ ...s, fromName: name.get(s.fromMemberId), toName: name.get(s.toMemberId) })),
    settlements: settlements.map((s: any) => ({ _id: String(s._id), fromName: name.get(String(s.fromMemberId)), toName: name.get(String(s.toMemberId)), amountPaise: s.amountPaise, date: s.date, note: s.note })),
  });
}));

const settleBody = z.object({
  fromMemberId: z.string(), toMemberId: z.string(), amountPaise: z.number().int().positive("Amount must be greater than zero"),
  date: z.coerce.date().optional(), note: z.string().max(200).optional(), idempotencyKey: z.string().max(80).optional(),
});
finance.post("/groups/:gid/settlements", wrap(async (req, res) => {
  const b = settleBody.parse(req.body);
  if (b.fromMemberId === b.toMemberId) throw new HttpError(400, "Payer and receiver must differ");
  const n = await Member.countDocuments({ groupId: req.params.gid, _id: { $in: [b.fromMemberId, b.toMemberId] } });
  if (n !== 2) throw new HttpError(400, "Both people must be members of this group");
  const { ledger } = await loadLedger(req.params.gid);
  const bal = new Map(computeBalances(ledger).rows.map((r) => [r.memberId, r.balancePaise]));
  const warning = b.amountPaise > Math.max(0, bal.get(b.fromMemberId) ?? 0) || b.amountPaise > Math.max(0, -(bal.get(b.toMemberId) ?? 0))
    ? "This is more than what is currently owed. Balances may flip sign." : undefined;
  res.status(201).json({ settlement: await Settlement.create({ ...b, groupId: req.params.gid }), warning });
}));
finance.delete("/settlements/:id", wrap(async (req, res) => { await Settlement.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

finance.get("/history", wrap(async (req, res) => res.json(await buildHistory(req.query as any))));

finance.get("/dashboard", wrap(async (req, res) => {
  const gid = (req.query.groupId as string) || undefined; // omit for "All groups"
  const groups = await Group.find(gid ? { _id: gid, archived: false } : { archived: false }).lean() as any[];
  let totalExpensesPaise = 0, paidPaise = 0, owePaise = 0, owedPaise = 0, memberCount = 0, hasMe = false;
  const suggestions: any[] = [];
  for (const g of groups) {
    const { ledger } = await loadLedger(String(g._id));
    const c = computeBalances(ledger);
    totalExpensesPaise += c.totalExpensesPaise;
    memberCount += ledger.members.filter((m) => m.isActive !== false).length;
    const nm = new Map(ledger.members.map((m) => [m.id, m.name]));
    for (const s of suggestSettlements(c.rows)) suggestions.push({ groupId: String(g._id), groupName: g.name, fromName: nm.get(s.fromMemberId), toName: nm.get(s.toMemberId), amountPaise: s.amountPaise });
    const me = g.meMemberId && c.rows.find((r) => r.memberId === String(g.meMemberId));
    if (!me) continue;
    hasMe = true; paidPaise += me.paidPaise + me.advancePaise;
    if (me.balancePaise > 0) owePaise += me.balancePaise; else owedPaise -= me.balancePaise;
  }
  res.json({ groupCount: groups.length, memberCount, totalExpensesPaise, paidPaise, owePaise, owedPaise, netPaise: owePaise - owedPaise, hasMe,
    suggestions: suggestions.slice(0, 8), recent: await buildHistory({ groupId: gid, limit: 8 }) });
}));

finance.get("/analytics", wrap(async (req, res) => {
  const { groupId, from, to, category } = req.query as Record<string, string | undefined>;
  const q: Record<string, unknown> = {};
  if (groupId) q.groupId = groupId;
  if (category) q.category = category;
  const range = dayRange(from, to); if (range) q.date = range;
  const [exps, mems, grps] = await Promise.all([Expense.find(q).lean(), Member.find(groupId ? { groupId } : {}).lean(), Group.find().lean()]) as any[][];
  const gn = new Map(grps.map((g) => [String(g._id), g.name]));
  const mn = new Map(mems.map((m) => [String(m._id), groupId ? m.name : `${m.name} (${gn.get(String(m.groupId))})`]));
  const add = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);
  const share = new Map<string, number>(), paid = new Map<string, number>(), cat = new Map<string, number>(), day = new Map<string, number>(), grp = new Map<string, number>();
  for (const e of exps) {
    e.shares.forEach((s: any) => add(share, mn.get(String(s.memberId)) ?? "Former member", s.sharePaise));
    if (e.paidBy === "member") add(paid, mn.get(String(e.paidByMemberId)) ?? "Former member", e.amountPaise);
    add(cat, e.category, e.amountPaise);
    add(day, new Date(e.date).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }), e.amountPaise);
    add(grp, gn.get(String(e.groupId)) ?? "Group", e.amountPaise);
  }
  const arr = (m: Map<string, number>, sort = true) => { const a = [...m].map(([name, valuePaise]) => ({ name, valuePaise })); return sort ? a.sort((x, y) => y.valuePaise - x.valuePaise) : a.sort((x, y) => x.name.localeCompare(y.name)); };
  res.json({ byMember: arr(share), paidByMember: arr(paid), byCategory: arr(cat), overTime: arr(day, false), byGroup: arr(grp), totalPaise: exps.reduce((s, e) => s + e.amountPaise, 0) });
}));
