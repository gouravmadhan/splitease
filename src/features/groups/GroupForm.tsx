import { useState } from "react";
import { api } from "@/lib/api";
import { useSave } from "@/lib/hooks";
import type { Group } from "@/lib/types";
import { Button, Field, Modal, inputCls } from "@/components/ui/ui";
import { cn } from "@/lib/cn";

const EMOJIS = ["🏖️", "👫", "🏠", "💼", "🍻", "✈️", "🎉", "🛒"];

export default function GroupForm({ open, onClose, group }: { open: boolean; onClose: () => void; group?: Group }) {
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [emoji, setEmoji] = useState(group?.emoji ?? EMOJIS[0]);
  const save = useSave(
    (b: object) => group ? api(`/groups/${group._id}`, { method: "PATCH", body: JSON.stringify(b) }) : api("/groups", { method: "POST", body: JSON.stringify(b) }),
    [["groups"], ["group"]],
    () => { if (!group) { setName(""); setDescription(""); } onClose(); },
  );
  return (
    <Modal open={open} onClose={onClose} title={group ? "Edit group" : "New group"}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => setEmoji(e)} aria-label={`Icon ${e}`}
              className={cn("grid h-11 w-11 place-items-center rounded-chip bg-page/60 text-xl", emoji === e && "ring-2 ring-primary")}>{e}</button>
          ))}
        </div>
        <Field label="Group name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Goa trip" autoFocus /></Field>
        <Field label="Description (optional)"><input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        {save.error && <p className="text-sm text-pay">{(save.error as Error).message}</p>}
        <Button className="w-full py-3" disabled={save.isPending} onClick={() => save.mutate({ name, description: description || undefined, emoji })}>
          {group ? "Save changes" : "Create group"}
        </Button>
      </div>
    </Modal>
  );
}
