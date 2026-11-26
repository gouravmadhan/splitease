import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { WIDGETS, useWidgets } from "@/lib/widgets";
import { Card, Switch } from "@/components/ui/extra";
import { Button } from "@/components/ui/ui";
import SecurityCard from "@/features/auth/SecurityCard";

export default function Settings() {
  const { dark, toggle } = useTheme();
  const { on, toggle: flip, reset } = useWidgets();
  const sections = ["Summary", "Sections"] as const;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card className="flex items-center justify-between"><div><p className="font-semibold">Theme</p><p className="text-sm text-muted">{dark ? "Dark" : "Light"} mode</p></div>
        <Button variant="soft" onClick={toggle}>{dark ? <Sun size={16} /> : <Moon size={16} />} Switch</Button></Card>

      <Card>
        <div className="mb-1 flex items-center justify-between"><div><h2 className="font-semibold">Dashboard widgets</h2><p className="text-sm text-muted">Choose what appears on your dashboard. Saved on this device.</p></div>
          <Button variant="soft" onClick={reset}>Show all</Button></div>
        {sections.map((sec) => (
          <div key={sec} className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{sec}</p>
            <ul className="divide-y divide-line">{WIDGETS.filter((w) => w.section === sec).map((w) => (
              <li key={w.key} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1"><p className="font-medium">{w.label}</p>{"hint" in w && <p className="text-xs text-muted">{w.hint}</p>}</div>
                <Switch on={on(w.key)} onChange={() => flip(w.key)} label={w.label} />
              </li>))}</ul>
          </div>))}
      </Card>

      <SecurityCard />
      <Card><p className="text-sm text-muted">Choose which member is you inside each group (Members tab) to power your dashboard totals.</p></Card>
    </div>
  );
}
