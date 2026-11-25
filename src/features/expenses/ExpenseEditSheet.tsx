import { Modal } from "@/components/ui/ui";
import ExpenseForm from "./ExpenseForm";

/** Bottom sheet on mobile, dialog on desktop. Works from any page; the expense's own group is looked up automatically. */
export default function ExpenseEditSheet({ expenseId, onClose }: { expenseId: string | null; onClose: () => void }) {
  return (
    <Modal open={!!expenseId} onClose={onClose} title="Edit expense">
      {expenseId && <ExpenseForm key={expenseId} expenseId={expenseId} onDone={onClose} onCancel={onClose} />}
    </Modal>
  );
}
