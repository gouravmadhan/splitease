import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { fmtDate, useSave } from "@/lib/hooks";
import { formatINR } from "@/lib/money";
import type { Expense } from "@/lib/types";
import { Card } from "@/components/ui/extra";
import { toast } from "@/components/ui/toast";
import ExpenseEditSheet from "./ExpenseEditSheet";

export default function ExpenseList({ groupId }: { groupId: string }) {
  const [editId, setEditId] = useState<string | null>(null);
  const { data } = useQuery({ queryKey: ["expenses", groupId], queryFn: () => api<Expense[]>(`/groups/${groupId}/expenses`) });
  const del = useSave((id: string) => api(`/expenses/${id}`, { method: "DELETE" }), [], () => toast("Expense deleted"));
  if (!data) return <p className="text-muted">Loading...</p>;
  if (!data.length) return <Card className="text-center text-sm text-muted">No expenses yet. Tap + to add the first one.</Card>;
  return (
    <Card>
      <ul className="space-y-1">{data.map((e) => (
        <li key={e._id}>
          <div role="button" tabIndex={0} aria-label={`Edit ${e.title}`} onClick={() => setEditId(e._id)}
            onKeyDown={(k) => (k.key === "Enter" || k.key === " ") && (k.preventDefault(), setEditId(e._id))}
            className="-mx-2 flex cursor-pointer items-center gap-3 rounded-chip px-2 py-3 transition-colors hover:bg-page/60 focus-visible:bg-page/60">
            <div className="min-w-0 flex-1"><p className="truncate font-medium">{e.title}</p>
              <p className="truncate text-xs text-muted">{fmtDate(e.date)}, {e.category}, {e.paidByName} paid, {e.participantCount} sharing</p></div>
            <p className="font-bold">{formatINR(e.amountPaise)}</p>
            <button aria-label="Delete expense" onClick={(ev) => { ev.stopPropagation(); confirm(`Delete "${e.title}"? Balances will update.`) && del.mutate(e._id); }}
              className="grid h-9 w-9 place-items-center rounded-full text-pay"><Trash2 size={16} /></button>
          </div>
        </li>))}</ul>
      <ExpenseEditSheet expenseId={editId} onClose={() => setEditId(null)} />
    </Card>
  );
}
