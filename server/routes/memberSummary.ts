import { Router } from "express";
import { loadLedger } from "../services/ledger.js";
import { dayRange } from "../services/history.js";
import { memberDetail, summarizeMembers } from "../services/memberSummary.js";
import { wrap, HttpError } from "./util.js";

export const memberSummary = Router();

memberSummary.get("/groups/:gid/member-summary", wrap(async (req, res) => {
  const { from, to, category, memberId } = req.query as Record<string, string | undefined>;
  const { members, expenses, advances, settlements } = await loadLedger(req.params.gid);
  const raw = { members, expenses, advances, settlements };
  const opts = { range: dayRange(from, to), category: category || undefined };
  let detail;
  if (memberId) { detail = memberDetail(raw, memberId, opts); if (!detail) throw new HttpError(404, "Member not found"); }
  res.json({ ...summarizeMembers(raw, opts), detail });
}));
