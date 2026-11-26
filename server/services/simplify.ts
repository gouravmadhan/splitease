import { suggestSettlements } from "./balance.js";

export type Payment = { fromMemberId: string; toMemberId: string; amountPaise: number };
const POOL = "__pool__";
const MAX_EXACT = 18; // 2^18 subsets is instant; above this we fall back to the greedy plan

/**
 * Fewest-payments plan. Balance convention: + pays, − receives.
 * Idea: the fewest payments = (people with a balance) − (the most groups that settle among themselves).
 * We find that maximum split with a subset DP, then settle each group with the greedy matcher
 * (inside a group that cannot be split further, that always needs exactly size−1 payments).
 *
 * Unspent advance cash is added as a pseudo payer so the numbers add up to zero; refunds from it are not
 * member-to-member payments, so they are dropped from the plan.
 */
export function simplifyDebts(rows: { memberId: string; balancePaise: number }[], poolRemainingPaise = 0) {
  const nodes = rows.filter((r) => r.balancePaise !== 0).map((r) => ({ memberId: r.memberId, balancePaise: r.balancePaise }));
  if (poolRemainingPaise !== 0) nodes.push({ memberId: POOL, balancePaise: poolRemainingPaise });
  const n = nodes.length;
  if (!n) return { payments: [] as Payment[], optimal: true };

  const total = nodes.reduce((s, x) => s + x.balancePaise, 0);
  if (n > MAX_EXACT || total !== 0) {
    return { payments: suggestSettlements(rows), optimal: false };
  }

  const full = (1 << n) - 1;
  const sum = new Float64Array(full + 1);
  const dp = new Int8Array(full + 1);
  const pick = new Int8Array(full + 1);
  for (let m = 1; m <= full; m++) {
    const low = 31 - Math.clz32(m & -m);
    sum[m] = sum[m & (m - 1)] + nodes[low].balancePaise;
    let best = -1, ch = 0;
    for (let i = 0; i < n; i++) if (m & (1 << i)) { const v = dp[m ^ (1 << i)]; if (v > best) { best = v; ch = i; } }
    dp[m] = best + (sum[m] === 0 ? 1 : 0);
    pick[m] = ch;
  }

  // Rebuild one ordering of the people; every point where the running total returns to zero closes a group.
  const order: number[] = [];
  for (let m = full; m; m ^= 1 << pick[m]) order.push(pick[m]);
  order.reverse();
  const groups: number[][] = []; let cur: number[] = [], run = 0;
  for (const i of order) { cur.push(i); run += nodes[i].balancePaise; if (run === 0) { groups.push(cur); cur = []; } }

  const payments: Payment[] = [];
  for (const g of groups) {
    for (const p of suggestSettlements(g.map((i) => nodes[i]))) {
      if (p.fromMemberId !== POOL && p.toMemberId !== POOL) payments.push(p);
    }
  }
  return { payments, optimal: true };
}
