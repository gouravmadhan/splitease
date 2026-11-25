import { describe, expect, it } from "vitest";
import { computeBalances, suggestSettlements, type Ledger } from "../server/services/balance";
import { equalSplit } from "../server/services/split";

const members = [{ id: "G", name: "Gourav" }, { id: "R", name: "Rahul" }, { id: "A", name: "Aman" }];
const ids = ["G", "R", "A"];
const base = (): Ledger => ({
  members,
  advances: [{ memberId: "G", amountPaise: 500000 }, { memberId: "R", amountPaise: 200000 }, { memberId: "A", amountPaise: 100000 }],
  expenses: [
    { amountPaise: 300000, paidBy: "pool", shares: equalSplit(300000, ids) },
    { amountPaise: 90000, paidBy: "member", paidByMemberId: "R", shares: equalSplit(90000, ids) },
  ],
  settlements: [],
});
const bal = (l: Ledger) => Object.fromEntries(computeBalances(l).rows.map((r) => [r.memberId, r.balancePaise]));

describe("split", () => {
  it("shares always sum to total (₹1000 / 3)", () => {
    const s = equalSplit(100000 + 1, ids);
    expect(s.reduce((a, x) => a + x.sharePaise, 0)).toBe(100001);
    expect(s.map((x) => x.sharePaise)).toEqual([33334, 33334, 33333]);
  });
});
describe("balances", () => {
  it("matches the agreed worked example", () => {
    expect(bal(base())).toEqual({ G: -370000, R: -160000, A: 30000 });
    expect(computeBalances(base()).poolRemainingPaise).toBe(500000);
  });
  it("all balances add up to minus the unspent pool", () => {
    const c = computeBalances(base());
    expect(c.rows.reduce((s, r) => s + r.balancePaise, 0)).toBe(-c.poolRemainingPaise);
  });
  it("member-paid expense without advances (₹3000 by Gourav)", () => {
    const l: Ledger = { members, advances: [], settlements: [], expenses: [{ amountPaise: 300000, paidBy: "member", paidByMemberId: "G", shares: equalSplit(300000, ids) }] };
    expect(bal(l)).toEqual({ G: -200000, R: 100000, A: 100000 });
  });
  it("payer outside the participants is fully credited", () => {
    const l: Ledger = { members, advances: [], settlements: [], expenses: [{ amountPaise: 1000, paidBy: "member", paidByMemberId: "G", shares: equalSplit(1000, ["R", "A"]) }] };
    expect(bal(l)).toEqual({ G: -1000, R: 500, A: 500 });
  });
  it("settlement moves both people toward zero", () => {
    const l = base(); l.settlements.push({ fromMemberId: "A", toMemberId: "G", amountPaise: 30000 });
    expect(bal(l)).toEqual({ G: -340000, R: -160000, A: 0 });
  });
  it("partial settlement", () => {
    const l = base(); l.settlements.push({ fromMemberId: "A", toMemberId: "G", amountPaise: 10000 });
    expect(bal(l).A).toBe(20000);
  });
});
describe("settlement suggestions", () => {
  it("Aman pays Gourav ₹300", () => {
    expect(suggestSettlements(computeBalances(base()).rows)).toEqual([{ fromMemberId: "A", toMemberId: "G", amountPaise: 30000 }]);
  });
  it("uses at most n−1 payments and settles everyone", () => {
    const rows = [{ memberId: "a", balancePaise: 700 }, { memberId: "b", balancePaise: 300 }, { memberId: "c", balancePaise: -600 }, { memberId: "d", balancePaise: -400 }];
    const s = suggestSettlements(rows);
    expect(s.length).toBeLessThanOrEqual(3);
    expect(s.reduce((t, x) => t + x.amountPaise, 0)).toBe(1000);
  });
});
