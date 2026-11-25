import { useState } from "react";
import { api } from "@/lib/api";
import { useSave } from "@/lib/hooks";
import { rupeesToPaise } from "@/lib/money";
import type { Member } from "@/lib/types";
import { Button, Field, Modal, inputCls } from "@/components/ui/ui";

export default function MemberForm({ open, onClose, groupId, member }: { open: boolean; onClose: () => void; groupId: string; member?: Member }) {
  const [f, setF] = useState({ name: member?.name ?? "", contact: member?.contact ?? "", notes: member?.notes ?? "", advance: "" });
  const [key] = useState(() => crypto.randomUUID()); // guards against double submit
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const save = useSave(async () => {
    const body = { name: f.name, contact: f.contact || undefined, notes: f.notes || undefined };
    if (member) return api(`/members/${member._id}`, { method: "PATCH", body: JSON.stringify(body) });
    const advancePaise = f.advance ? rupeesToPaise(f.advance) : 0;
    return api(`/groups/${groupId}/members`, { method: "POST", body: JSON.stringify({ ...body, advancePaise, idempotencyKey: key }) });
  }, [["group"], ["groups"]], () => { setF({ name: "", contact: "", notes: "", advance: "" }); onClose(); });
  return (
    <Modal open={open} onClose={onClose} title={member ? "Edit member" : "Add member"}>
      <div className="space-y-4">
        <Field label="Name"><input className={inputCls} value={f.name} onChange={set("name")} autoFocus /></Field>
        <Field label="Contact (optional)"><input className={inputCls} value={f.contact} onChange={set("contact")} inputMode="tel" /></Field>
        {!member && <Field label="Initial advance in ₹ (optional)"><input className={inputCls} value={f.advance} onChange={set("advance")} inputMode="decimal" placeholder="5000" /></Field>}
        <Field label="Notes (optional)"><input className={inputCls} value={f.notes} onChange={set("notes")} /></Field>
        {save.error && <p className="text-sm text-pay">{(save.error as Error).message}</p>}
        <Button className="w-full py-3" disabled={save.isPending} onClick={() => save.mutate(undefined)}>{member ? "Save changes" : "Add member"}</Button>
      </div>
    </Modal>
  );
}
