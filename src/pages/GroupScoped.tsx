import { type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useActiveGroup } from "@/lib/hooks";
import { GroupSelect } from "@/components/ui/extra";

export default function GroupScoped({ title, children }: { title: string; children: (id: string) => ReactNode }) {
  const { groups, active } = useActiveGroup(); const [sp, setSp] = useSearchParams();
  const id = sp.get("g") ?? active?._id ?? "";
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      {groups && !groups.length && <p className="rounded-card bg-card p-6 text-center text-muted">Create a group first.</p>}
      {groups && groups.length > 0 && <GroupSelect groups={groups} value={id} onChange={(v) => setSp({ g: v })} />}
      {id && children(id)}
    </div>
  );
}
