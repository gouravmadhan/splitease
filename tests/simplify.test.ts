import { describe, expect, it } from "vitest";
import { simplifyDebts } from "../server/services/simplify";
import { suggestSettlements } from "../server/services/balance";

type Row = { memberId: string; balancePaise: number };
const apply = (rows: Row[], pays: { fromMemberId: string; toMemberId: string; amountPaise: number }[]) => {
  const b = new Map(rows.map((r) => [r.memberId, r.balancePaise]));
  for (const p of pays) { b.set(p.fromMemberId, b.get(p.fromMemberId)! - p.amountPaise); b.set(p.toMemberId, b.get(p.toMemberId)! + p.amountPaise); }
  return b;
};

describe("simplifyDebts", () => {
  it("spec example: three payers pay Gourav", () => {
    const rows = [{ memberId: "G", balancePaise: -300000 }, { memberId: "R", balancePaise: 150000 }, { memberId: "A", balancePaise: 100000 }, { memberId: "S", balancePaise: 50000 }];
    const { payments } = simplifyDebts(rows);
    expect(payments).toHaveLength(3);
    expect(payments.every((p) => p.toMemberId === "G")).toBe(true);
    expect([...apply(rows, payments).values()].every((v) => v === 0)).toBe(true);
  });
  it("beats the standard plan when the group splits into independent sub-groups", () => {
    // payers 10, 7 and receivers 6, 4, 7: standard needs 4 payments, the minimum is 3
    const rows = [["a", 10], ["b", 7], ["c", -6], ["d", -4], ["e", -7]].map(([m, v]) => ({ memberId: m as string, balancePaise: (v as number) * 100 }));
    expect(suggestSettlements(rows)).toHaveLength(4);
    const { payments, optimal } = simplifyDebts(rows);
    expect(optimal).toBe(true);
    expect(payments).toHaveLength(3);
    expect([...apply(rows, payments).values()].every((v) => v === 0)).toBe(true);
  });
  it("never includes people with a zero balance", () => {
    const rows = [{ memberId: "x", balancePaise: 500 }, { memberId: "y", balancePaise: 0 }, { memberId: "z", balancePaise: -500 }];
    const { payments } = simplifyDebts(rows);
    expect(payments).toEqual([{ fromMemberId: "x", toMemberId: "z", amountPaise: 500 }]);
  });
  it("leftover advance cash is not a member payment (agreed worked example)", () => {
    const rows = [{ memberId: "G", balancePaise: -370000 }, { memberId: "R", balancePaise: -160000 }, { memberId: "A", balancePaise: 30000 }];
    const { payments } = simplifyDebts(rows, 500000);
    // one member payment: Aman pays ₹300 to a person who is owed money; the rest of the credit is refunded from the pool
    expect(payments).toHaveLength(1);
    expect(payments[0].fromMemberId).toBe("A");
    expect(payments[0].amountPaise).toBe(30000);
    expect(["G", "R"]).toContain(payments[0].toMemberId);
  });
  it("nothing to settle", () => expect(simplifyDebts([]).payments).toEqual([]));
  it("random groups: always settles everyone, never more payments than the standard plan", () => {
    let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    for (let t = 0; t < 300; t++) {
      const n = 2 + Math.floor(rnd() * 8);
      const v = Array.from({ length: n - 1 }, () => Math.round((rnd() - 0.5) * 40) * 100);
      v.push(-v.reduce((a, b) => a + b, 0));
      const rows = v.map((x, i) => ({ memberId: `m${i}`, balancePaise: x }));
      const { payments } = simplifyDebts(rows);
      expect([...apply(rows, payments).values()].every((x) => x === 0)).toBe(true);
      expect(payments.length).toBeLessThanOrEqual(suggestSettlements(rows).length);
      expect(payments.every((p) => p.amountPaise > 0 && p.fromMemberId !== p.toMemberId)).toBe(true);
      // payers only pay, receivers only receive
      const bal = new Map(rows.map((r) => [r.memberId, r.balancePaise]));
      expect(payments.every((p) => bal.get(p.fromMemberId)! > 0 && bal.get(p.toMemberId)! < 0)).toBe(true);
    }
  });
});
