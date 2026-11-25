import { Group, Member, Expense, Advance, Settlement } from "../models";

export const dayRange = (from?: string, to?: string) => {
  const r: Record<string, Date> = {};
  if (from) r.$gte = new Date(`${from}T00:00:00+05:30`);
  if (to) r.$lte = new Date(`${to}T23:59:59.999+05:30`);
  return Object.keys(r).length ? r : undefined;
};

type F = { category?: string; groupId?: string; memberId?: string; type?: string; from?: string; to?: string; limit?: number };
export async function buildHistory(f: F) {
  const q: Record<string, unknown> = {};
  if (f.groupId) q.groupId = f.groupId;
  const range = dayRange(f.from, f.to); if (range) q.date = range;
  const want = (t: string) => (!f.type || f.type === t) && (!f.category || t === "expense"); // a category only applies to expenses
  const [groups, members, ex, ad, st] = await Promise.all([
    Group.find().lean(), Member.find(f.groupId ? { groupId: f.groupId } : {}).lean(),
    want("expense") ? Expense.find(f.category ? { ...q, category: f.category } : q).lean() : [], want("advance") ? Advance.find(q).lean() : [], want("settlement") ? Settlement.find(q).lean() : [],
  ]) as any[][];
  const gn = new Map(groups.map((g) => [String(g._id), g.name])), mn = new Map(members.map((m) => [String(m._id), m.name]));
  const n = (id: unknown) => mn.get(String(id)) ?? "Former member";
  const items = [
    ...ex.map((e) => ({ id: String(e._id), type: "expense", groupId: String(e.groupId), date: e.date, title: e.title, amountPaise: e.amountPaise,
      detail: e.paidBy === "pool" ? "Paid from advance pool" : `Paid by ${n(e.paidByMemberId)}`, memberIds: [e.paidByMemberId, ...e.shares.map((s: any) => s.memberId)].filter(Boolean).map(String) })),
    ...ad.map((a) => ({ id: String(a._id), type: "advance", groupId: String(a.groupId), date: a.date, title: `Advance from ${n(a.memberId)}`, amountPaise: a.amountPaise, detail: a.note ?? "", memberIds: [String(a.memberId)] })),
    ...st.map((s) => ({ id: String(s._id), type: "settlement", groupId: String(s.groupId), date: s.date, title: `${n(s.fromMemberId)} paid ${n(s.toMemberId)}`, amountPaise: s.amountPaise, detail: s.note ?? "", memberIds: [String(s.fromMemberId), String(s.toMemberId)] })),
  ].filter((i) => !f.memberId || i.memberIds.includes(f.memberId))
   .map(({ memberIds, ...i }) => ({ ...i, groupName: gn.get(i.groupId) ?? "" }))
   .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  return items.slice(0, f.limit ?? 300);
}
