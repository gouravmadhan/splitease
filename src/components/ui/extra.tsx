import { type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { describeBalance } from "@/lib/money";
import { inputCls } from "./ui";
import type { Group } from "@/lib/types";

export function BalanceBadge({ paise, className }: { paise: number; className?: string }) {
  const d = describeBalance(paise);
  return <span className={cn("whitespace-nowrap rounded-chip px-3 py-1.5 text-sm font-bold",
    d.tone === "pay" && "bg-pay-bg text-pay", d.tone === "receive" && "bg-receive-bg text-receive", d.tone === "settled" && "bg-page text-muted", className)}>{d.label}</span>;
}
export const Card = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cn("rounded-card bg-card p-5", className)}>{children}</div>;
export function GroupSelect({ groups, value, onChange, all }: { groups: Group[]; value: string; onChange: (v: string) => void; all?: boolean }) {
  return <select aria-label="Group" className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
    {all && <option value="">All groups</option>}{groups.map((g) => <option key={g._id} value={g._id}>{g.emoji} {g.name}</option>)}</select>;
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={onChange}
      className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-line")}>
      <span className={cn("absolute top-0.5 h-6 w-6 rounded-full bg-card shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}
