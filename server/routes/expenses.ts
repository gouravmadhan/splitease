import { Router } from "express";
import { z } from "zod";
import { Member, Expense } from "../models/index.js";
import { equalSplit } from "../services/split.js";
import { wrap, HttpError } from "./util.js";

export const expenses = Router();
const body = z.object({
  title: z.string().trim().min(1, "Title is required").max(100),
  amountPaise: z.number().int().positive("Amount must be greater than zero"),
  category: z.string().max(30).default("Other"),
  date: z.coerce.date(),
  paidBy: z.enum(["member", "pool"]),
  paidByMemberId: z.string().optional(),
  participantIds: z.array(z.string()).default([]),
  splitType: z.enum(["equal", "custom"]).default("equal"), // percent: add later, shares model already supports it
  shares: z.array(z.object({ memberId: z.string(), sharePaise: z.number().int().min(0) })).optional(),
  description: z.string().max(300).optional(),
  idempotencyKey: z.string().max(80).optional(),
});

async function build(groupId: string, raw: unknown) {
  const b = body.parse(raw);
  const active = new Set((await Member.find({ groupId, isActive: true }).select("_id").lean() as any[]).map((m) => String(m._id)));
  if (b.paidBy === "member" && !(b.paidByMemberId && active.has(b.paidByMemberId))) throw new HttpError(400, "Choose who paid");
  const ids = b.splitType === "custom" ? (b.shares ?? []).map((s) => s.memberId) : b.participantIds;
  if (ids.some((id) => !active.has(id))) throw new HttpError(400, "Participants must be members of this group");
  const shares = b.splitType === "custom" ? b.shares ?? [] : equalSplit(b.amountPaise, [...new Set(b.participantIds)]);
  return { groupId, title: b.title, amountPaise: b.amountPaise, category: b.category, date: b.date, paidBy: b.paidBy,
    paidByMemberId: b.paidBy === "member" ? b.paidByMemberId : undefined, splitType: b.splitType, shares,
    description: b.description, idempotencyKey: b.idempotencyKey };
}

expenses.get("/groups/:gid/expenses", wrap(async (req, res) => {
  const [list, members] = await Promise.all([Expense.find({ groupId: req.params.gid }).sort({ date: -1, createdAt: -1 }).lean(), Member.find({ groupId: req.params.gid }).lean()]) as any[][];
  const mn = new Map(members.map((m) => [String(m._id), m.name]));
  res.json(list.map((e) => ({ ...e, paidByName: e.paidBy === "pool" ? "Advance pool" : mn.get(String(e.paidByMemberId)) ?? "Former member", participantCount: e.shares.length })));
}));
expenses.get("/expenses/:id", wrap(async (req, res) => {
  const e = await Expense.findById(req.params.id).lean();
  if (!e) throw new HttpError(404, "Expense not found");
  res.json(e);
}));
expenses.post("/groups/:gid/expenses", wrap(async (req, res) => {
  res.status(201).json(await Expense.create(await build(req.params.gid, req.body)));
}));
expenses.patch("/expenses/:id", wrap(async (req, res) => {
  const doc: any = await Expense.findById(req.params.id);
  if (!doc) throw new HttpError(404, "Expense not found");
  doc.set(await build(String(doc.groupId), req.body));
  if (doc.paidBy === "pool") doc.paidByMemberId = undefined;
  res.json(await doc.save());
}));
expenses.delete("/expenses/:id", wrap(async (req, res) => { await Expense.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));
