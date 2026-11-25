export type Group = { _id: string; name: string; description?: string; emoji?: string; isDefault?: boolean; meMemberId?: string; memberCount?: number; advanceTotalPaise?: number };
export type Member = { _id: string; groupId: string; name: string; contact?: string; notes?: string; advanceTotalPaise: number };
export type Advance = { _id: string; memberId: string; amountPaise: number; date: string; note?: string };
export type Expense = { _id: string; groupId: string; title: string; amountPaise: number; category: string; date: string; paidBy: "member" | "pool"; paidByMemberId?: string; shares: { memberId: string; sharePaise: number }[]; description?: string; paidByName?: string; participantCount?: number };
export type Balances = {
  rows: { memberId: string; name: string; sharePaise: number; advancePaise: number; paidPaise: number; balancePaise: number }[];
  poolRemainingPaise: number; totalExpensesPaise: number;
  suggestions: { fromMemberId: string; toMemberId: string; fromName: string; toName: string; amountPaise: number }[];
  settlements: { _id: string; fromName: string; toName: string; amountPaise: number; date: string; note?: string }[];
};
export type HistoryItem = { id: string; groupId: string; type: "expense" | "advance" | "settlement"; groupName: string; date: string; title: string; amountPaise: number; detail: string };
export type Slice = { name: string; valuePaise: number };
export const CATEGORIES = ["Food", "Travel", "Stay", "Groceries", "Fuel", "Shopping", "Entertainment", "Bills", "Donation", "Other"];
