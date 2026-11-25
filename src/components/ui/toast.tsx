import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";

type T = { id: number; msg: string; kind: "ok" | "err" };
let items: T[] = []; let n = 0; const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
export const toast = (msg: string, kind: "ok" | "err" = "ok") => {
  const id = ++n; items = [...items, { id, msg, kind }]; emit();
  setTimeout(() => { items = items.filter((t) => t.id !== id); emit(); }, 3200);
};
export function Toaster() {
  const list = useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => items);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      {list.map((t) => <div key={t.id} role="status" className={cn("rounded-chip px-4 py-3 text-sm font-semibold shadow-lg", t.kind === "ok" ? "bg-primary text-primary-fg" : "border border-pay bg-pay-bg text-pay")}>{t.msg}</div>)}
    </div>
  );
}
