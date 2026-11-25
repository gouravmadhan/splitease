import { Router } from "express";
import { Group, Member, Expense, Advance, Settlement } from "../models";
import { memberBody, advanceBody } from "../validators";
import { wrap, HttpError } from "./util";

export const members = Router();

members.post("/groups/:gid/members", wrap(async (req, res) => {
  const { advancePaise, idempotencyKey, ...data } = memberBody.parse(req.body);
  if (!(await Group.exists({ _id: req.params.gid }))) throw new HttpError(404, "Group not found");
  const member = await Member.create({ ...data, groupId: req.params.gid });
  // Initial advance is just the first entry in the advance history.
  if (advancePaise) await Advance.create({ groupId: req.params.gid, memberId: member._id, amountPaise: advancePaise, note: "Initial advance", idempotencyKey });
  res.status(201).json(member);
}));

members.patch("/members/:id", wrap(async (req, res) => {
  const { name, contact, notes } = memberBody.partial().parse(req.body);
  const m = await Member.findByIdAndUpdate(req.params.id, { name, contact, notes }, { new: true, runValidators: true });
  if (!m) throw new HttpError(404, "Member not found");
  res.json(m);
}));

// Members with any history are archived (history and balances stay intact); unused ones are deleted.
members.delete("/members/:id", wrap(async (req, res) => {
  const id = req.params.id;
  const used = (await Promise.all([
    Expense.exists({ $or: [{ paidByMemberId: id }, { "shares.memberId": id }] }),
    Advance.exists({ memberId: id }),
    Settlement.exists({ $or: [{ fromMemberId: id }, { toMemberId: id }] }),
  ])).some(Boolean);
  if (used) await Member.findByIdAndUpdate(id, { isActive: false });
  else await Member.findByIdAndDelete(id);
  res.json({ archived: used });
}));

members.get("/groups/:gid/advances", wrap(async (req, res) => {
  const q: Record<string, unknown> = { groupId: req.params.gid };
  if (req.query.memberId) q.memberId = req.query.memberId;
  res.json(await Advance.find(q).sort({ date: -1, createdAt: -1 }).lean());
}));

members.post("/members/:id/advances", wrap(async (req, res) => {
  const m: any = await Member.findById(req.params.id);
  if (!m) throw new HttpError(404, "Member not found");
  res.status(201).json(await Advance.create({ ...advanceBody.parse(req.body), groupId: m.groupId, memberId: m._id }));
}));

// Editing changes the existing ledger entry, never adds a second one (no double counting).
members.patch("/advances/:id", wrap(async (req, res) => {
  const a = await Advance.findByIdAndUpdate(req.params.id, advanceBody.partial().parse(req.body), { new: true, runValidators: true });
  if (!a) throw new HttpError(404, "Advance not found");
  res.json(a);
}));

members.delete("/advances/:id", wrap(async (req, res) => {
  await Advance.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));
