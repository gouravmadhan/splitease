import { describe, expect, it } from "vitest";
import { memberDetail, summarizeMembers, type Raw } from "../server/services/memberSummary";

const d = (s: string) => new Date(`${s}+05:30`);
const sh = (a: number) => ["G", "R", "A"].map((memberId) => ({ memberId, sharePaise: a / 3 }));
const raw: Raw = {
  members: [{ _id: "G", name: "Gourav" }, { _id: "R", name: "Rahul" }, { _id: "A", name: "Aman" }],
  expenses: [
    { _id: "e1", title: "Hotel", amountPaise: 300000, category: "Stay", date: d("2026-11-20T12:00:00"), paidBy: "pool", shares: sh(300000) },
    { _id: "e2", title: "Dinner", amountPaise: 90000, category: "Food", date: d("2026-11-22T12:00:00"), paidBy: "member", paidByMemberId: "R", shares: sh(90000) },
    { _id: "e3", title: "Fuel", amountPaise: 150000, category: "Fuel", date: d("2026-11-24T12:00:00"), paidBy: "member", paidByMemberId: "G", shares: sh(150000) },
  ],
  advances: [
    { _id: "a1", memberId: "G", amountPaise: 500000, date: d("2026-11-19T10:00:00"), note: "Initial advance" },
    { _id: "a2", memberId: "R", amountPaise: 200000, date: d("2026-11-19T10:00:00") },
    { _id: "a3", memberId: "A", amountPaise: 100000, date: d("2026-11-19T10:00:00") },
  ],
  settlements: [{ _id: "s1", fromMemberId: "A", toMemberId: "G", amountPaise: 30000, date: d("2026-11-25T10:00:00") }],
};
const row = (m: ReturnType<typeof summarizeMembers>, id: string) => m.members.find((x) => x.memberId === id)!;

describe("member summary", () => {
  const all = summarizeMembers(raw);
  it("keeps paid, share, advances and settlements as separate figures", () => {
    expect(row(all, "G")).toMatchObject({ paidPaise: 150000, sharePaise: 180000, advancePaise: 500000, settledInPaise: 30000, settledOutPaise: 0 });
    expect(row(all, "R")).toMatchObject({ paidPaise: 90000, sharePaise: 180000, advancePaise: 200000 });
    expect(row(all, "A")).toMatchObject({ paidPaise: 0, sharePaise: 180000, settledOutPaise: 30000 });
  });
  it("advances are never counted as paid", () => expect(row(all, "G").paidPaise).toBe(150000));
  it("net = share − advances − paid − settlements paid + settlements received", () => {
    for (const m of all.members) expect(m.netPaise).toBe(m.sharePaise - m.advancePaise - m.paidPaise - m.settledOutPaise + m.settledInPaise);
    expect(all.members.map((m) => m.netPaise)).toEqual([-440000, -110000, 50000]);
  });
  it("counts the expenses each member took part in", () => {
    expect(all.members.every((m) => m.expenseCount === 3)).toBe(true);
    expect(all.totals.expenseCount).toBe(3);
  });
  it("category filter narrows paid/share/count but never the real net balance", () => {
    const f = summarizeMembers(raw, { category: "Food" });
    expect(row(f, "R")).toMatchObject({ paidPaise: 90000, sharePaise: 30000, expenseCount: 1 });
    expect(row(f, "G").paidPaise).toBe(0);
    expect(f.members.map((m) => m.netPaise)).toEqual([-440000, -110000, 50000]);
  });
  it("date filter also narrows advances and settlements", () => {
    const f = summarizeMembers(raw, { range: { $gte: d("2026-11-23T00:00:00"), $lte: d("2026-11-25T23:59:59") } });
    expect(row(f, "G")).toMatchObject({ paidPaise: 150000, expenseCount: 1, advancePaise: 0, settledInPaise: 30000 });
    expect(row(f, "A").settledOutPaise).toBe(30000);
    expect(row(f, "G").netPaise).toBe(-440000);
  });
});

describe("member detail", () => {
  const det = memberDetail(raw, "G")!;
  it("lists expenses with paid and share separately", () => {
    expect(det.lines).toHaveLength(3);
    expect(det.lines.reduce((t, l) => t + l.paidPaise, 0)).toBe(det.member.paidPaise);
    expect(det.lines.reduce((t, l) => t + l.sharePaise, 0)).toBe(det.member.sharePaise);
    expect(det.lines.find((l) => l.title === "Hotel")).toMatchObject({ paidPaise: 0, paidFromPool: true, sharePaise: 100000 });
  });
  it("category totals add up to the member totals", () => {
    expect(det.categories.reduce((t, c) => t + c.sharePaise, 0)).toBe(det.member.sharePaise);
    expect(det.categories.reduce((t, c) => t + c.paidPaise, 0)).toBe(det.member.paidPaise);
  });
  it("shows advances and settlements on their own", () => {
    expect(det.advances.map((a) => a.amountPaise)).toEqual([500000]);
    expect(det.settlements).toEqual([expect.objectContaining({ direction: "received", otherName: "Aman", amountPaise: 30000 })]);
    expect(det.contributedPaise).toBe(650000);
  });
  it("unknown member returns null", () => expect(memberDetail(raw, "nope")).toBeNull());
});
