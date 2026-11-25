import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import ExpenseForm from "@/features/expenses/ExpenseForm";

export default function AddExpense() {
  const { eid } = useParams(); const [sp] = useSearchParams(); const nav = useNavigate();
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold">{eid ? "Edit expense" : "New expense"}</h1>
      <div className="rounded-card bg-card p-5">
        <ExpenseForm expenseId={eid} groupId={sp.get("g") ?? undefined} onDone={(g) => nav(`/groups/${g}`)} onCancel={() => nav(-1)} />
      </div>
    </div>
  );
}
