import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { X } from "lucide-react";
import ExpenseForm from "@/features/expenses/ExpenseForm";

export default function AddExpense() {
  const { eid } = useParams(); const [sp] = useSearchParams(); const nav = useNavigate();
  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{eid ? "Edit expense" : "New expense"}</h1>
        <Link to="/" aria-label="Close and go to dashboard" className="grid h-11 w-11 place-items-center rounded-full bg-card text-muted transition-colors hover:text-ink"><X size={20} /></Link>
      </div>
      <div className="rounded-card bg-card p-5">
        <ExpenseForm expenseId={eid} groupId={sp.get("g") ?? undefined} onDone={(g) => nav(`/groups/${g}`)} onCancel={() => nav(-1)} />
      </div>
    </div>
  );
}
