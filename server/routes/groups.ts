import { Router } from "express";
import { Group, Member, Expense, Advance, Settlement } from "../models";
import { groupBody } from "../validators";
import { wrap, HttpError } from "./util";

export const groups = Router();

const sumBy = (rows: { _id: unknown; t: number }[]) => new Map(rows.map((r) => [String(r._id), r.t]));

groups.get("/groups", wrap(async (_req, res) => {
  const list = await Group.find({ archived: false }).sort({ createdAt: -1 }).lean();
  const ids = list.map((g: any) => g._id);
  const [mc, ac] = await Promise.all([
    Member.aggregate([{ $match: { groupId: { $in: ids }, isActive: true } }, { $group: { _id: "$groupId", t: { $sum: 1 } } }]),
    Advance.aggregate([{ $match: { groupId: { $in: ids } } }, { $group: { _id: "$groupId", t: { $sum: "$amountPaise" } } }]),
  ]);
  const m = sumBy(mc), a = sumBy(ac);
  res.json(list.map((g: any) => ({ ...g, memberCount: m.get(String(g._id)) ?? 0, advanceTotalPaise: a.get(String(g._id)) ?? 0 })));
}));

groups.post("/groups", wrap(async (req, res) => {
  res.status(201).json(await Group.create(groupBody.parse(req.body)));
}));

groups.get("/groups/:id", wrap(async (req, res) => {
  const group = await Group.findById(req.params.id).lean();
  if (!group) throw new HttpError(404, "Group not found");
  const [members, adv] = await Promise.all([
    Member.find({ groupId: req.params.id, isActive: true }).sort({ createdAt: 1 }).lean(),
    Advance.aggregate([{ $match: { groupId: (group as any)._id } }, { $group: { _id: "$memberId", t: { $sum: "$amountPaise" } } }]),
  ]);
  const a = sumBy(adv);
  res.json({ group, members: members.map((m: any) => ({ ...m, advanceTotalPaise: a.get(String(m._id)) ?? 0 })) });
}));

groups.patch("/groups/:id", wrap(async (req, res) => {
  const g = await Group.findByIdAndUpdate(req.params.id, groupBody.partial().parse(req.body), { new: true, runValidators: true });
  if (!g) throw new HttpError(404, "Group not found");
  res.json(g);
}));

groups.delete("/groups/:id", wrap(async (req, res) => {
  const id = req.params.id;
  await Promise.all([Expense, Advance, Settlement, Member].map((M: any) => M.deleteMany({ groupId: id })));
  await Group.findByIdAndDelete(id);
  res.json({ ok: true });
}));

// Only one group is ever the active (default) group.
groups.post("/groups/:id/default", wrap(async (req, res) => {
  if (!(await Group.exists({ _id: req.params.id }))) throw new HttpError(404, "Group not found");
  await Group.updateMany({ isDefault: true }, { isDefault: false });
  await Group.findByIdAndUpdate(req.params.id, { isDefault: true });
  res.json({ ok: true });
}));
