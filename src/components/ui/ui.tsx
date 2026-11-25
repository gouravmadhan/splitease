import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export const inputCls = "w-full rounded-chip border border-line bg-page/40 px-4 py-3 text-base outline-none focus:border-primary";

export function Button({ variant = "primary", className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "soft" | "danger" }) {
  return <button {...p} className={cn(
    "inline-flex items-center justify-center gap-2 rounded-chip px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50",
    variant === "primary" && "bg-primary text-primary-fg",
    variant === "soft" && "bg-pill text-pill-fg",
    variant === "danger" && "bg-pay-bg text-pay", className)} />;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-sm font-medium text-muted">{label}</span>{children}</label>;
}

/** Bottom sheet on mobile, centred dialog on desktop. */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-card bg-card p-5 md:max-w-md md:rounded-card"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-page/60"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
