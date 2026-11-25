import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Trash2, Check } from "lucide-react";
import { api } from "@/lib/api";
import { fmtDate, useSave } from "@/lib/hooks";
import { formatINR, rupeesToPaise } from "@/lib/money";
import type { Advance, Member } from "@/lib/types";
import { Button, Modal, inputCls } from "@/components/ui/ui";

export default function AdvanceModal({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const [amount, setAmount] = useState(""); const [note, setNote] = useState("");
  const [editId, setEditId] = useState<string | null>(null); const [editAmt, setEditAmt] = useState("");
  const { data = [] } = useQuery({
    queryKey: ["advances", member?._id], enabled: !!member,
    queryFn: () => api<Advance[]>(`/groups/${member!.groupId}/advances?memberId=${member!._id}`),
  });
  const keys = [["advances"], ["group"], ["groups"]];
  const add = useSave(() => api(`/members/${member!._id}/advances`, { method: "POST", body: JSON.stringify({ amountPaise: rupeesToPaise(amount), note: note || undefined }) }), keys, () => { setAmount(""); setNote(""); });
  const edit = useSave((id: string) => api(`/advances/${id}`, { method: "PATCH", body: JSON.stringify({ amountPaise: rupeesToPaise(editAmt) }) }), keys, () => setEditId(null));
  const del = useSave((id: string) => api(`/advances/${id}`, { method: "DELETE" }), keys);
  const err = (add.error ?? edit.error ?? del.error) as Error | null;
  const total = data.reduce((s, a) => s + a.amountPaise, 0);
  return (
    <Modal open={!!member} onClose={onClose} title={`${member?.name ?? ""}: advances`}>
      <div className="space-y-4">
        <div className="rounded-chip bg-receive-bg p-4 text-receive"><p className="text-sm">Total advance</p><p className="text-2xl font-bold">{formatINR(total)}</p></div>
        <div className="flex gap-2">
          <input className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="Amount ₹" aria-label="Advance amount" />
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" aria-label="Note" />
        </div>
        <Button className="w-full" disabled={add.isPending || !amount} onClick={() => add.mutate(undefined)}>Add advance</Button>
        {err && <p className="text-sm text-pay">{err.message}</p>}
        <ul className="divide-y divide-line">
          {data.map((a) => (
            <li key={a._id} className="flex items-center gap-2 py-3">
              <div className="min-w-0 flex-1">
                {editId === a._id
                  ? <input className={inputCls} value={editAmt} onChange={(e) => setEditAmt(e.target.value)} inputMode="decimal" autoFocus aria-label="New amount" />
                  : <p className="font-semibold">{formatINR(a.amountPaise)}</p>}
                <p className="truncate text-xs text-muted">{fmtDate(a.date)}{a.note ? `, ${a.note}` : ""}</p>
              </div>
              {editId === a._id
                ? <button aria-label="Save" onClick={() => edit.mutate(a._id)} className="grid h-9 w-9 place-items-center rounded-full bg-pill text-pill-fg"><Check size={16} /></button>
                : <button aria-label="Edit advance" onClick={() => { setEditId(a._id); setEditAmt(String(a.amountPaise / 100)); }} className="grid h-9 w-9 place-items-center rounded-full text-muted"><Pencil size={16} /></button>}
              <button aria-label="Delete advance" onClick={() => confirm("Delete this advance?") && del.mutate(a._id)} className="grid h-9 w-9 place-items-center rounded-full text-pay"><Trash2 size={16} /></button>
            </li>
          ))}
          {!data.length && <li className="py-4 text-center text-sm text-muted">No advances yet.</li>}
        </ul>
      </div>
    </Modal>
  );
}
