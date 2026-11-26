import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Star, Users } from "lucide-react";
import { formatINR } from "@/lib/money";
import { useActiveGroup, useSetActive } from "@/lib/hooks";
import { Button } from "@/components/ui/ui";
import GroupForm from "@/features/groups/GroupForm";
import { cn } from "@/lib/cn";

export default function Groups() {
  const [open, setOpen] = useState(false);
  const { groups: data, active, isLoading } = useActiveGroup();
  const setActive = useSetActive();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Groups</h1>
        <Button onClick={() => setOpen(true)}><Plus size={16} /> New group</Button>
      </div>
      {isLoading && <p className="text-muted">Loading groups...</p>}
      {data && !data.length && (
        <div className="rounded-card bg-card p-8 text-center">
          <p className="font-semibold">No groups yet</p>
          <p className="mt-1 text-sm text-muted">Create a group such as "Goa trip", then add the people sharing costs.</p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {data?.map((g) => {
          const isActive = active?._id === g._id;
          return (
            <div key={g._id} className={cn("relative cursor-pointer rounded-card bg-card p-5 transition hover:bg-card/70 hover:shadow-md active:scale-[0.99] focus-within:shadow-md", isActive && "ring-2 ring-primary")}>
              <Link to={`/groups/${g._id}`} className="flex items-center gap-3 after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary">
                <span className="grid h-12 w-12 place-items-center rounded-chip bg-pill text-2xl">{g.emoji ?? "👥"}</span>
                <div className="min-w-0"><p className="truncate font-semibold">{g.name}</p>
                  <p className="flex items-center gap-1 text-sm text-muted"><Users size={14} /> {g.memberCount} members</p></div>
              </Link>
              <div className="mt-4 flex items-center justify-between gap-2">
                <p className="text-sm text-muted">Advances <span className="font-semibold text-ink">{formatINR(g.advanceTotalPaise ?? 0)}</span></p>
                {isActive
                  ? <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg"><Star size={12} className="fill-current" /> Active</span>
                  : <Button variant="soft" aria-label={`Set ${g.name} as active group`} className="relative z-10 px-3 py-1.5 text-xs" onClick={() => setActive.mutate(g._id)}>Set active</Button>}
              </div>
            </div>);
        })}
      </div>
      <GroupForm key={String(open)} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
