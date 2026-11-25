import { useState } from "react";

/** Dashboard widgets the user can show or hide (Settings). Add an entry here to make a new widget toggleable. */
export const WIDGETS = [
  { key: "ring", label: "Balance ring", hint: "Circular overall balance", section: "Summary" },
  { key: "totalExpenses", label: "Total expenses", section: "Summary" },
  { key: "paid", label: "Paid by me", section: "Summary" },
  { key: "owe", label: "I owe", section: "Summary" },
  { key: "owed", label: "Owed to me", section: "Summary" },
  { key: "count", label: "Members / groups count", section: "Summary" },
  { key: "insights", label: "Insights shortcut", hint: "Link to reports", section: "Summary" },
  { key: "categories", label: "Where it went", hint: "Category donut chart", section: "Sections" },
  { key: "members", label: "Member-wise spending", section: "Sections" },
  { key: "settle", label: "Settlement summary", section: "Sections" },
  { key: "recent", label: "Recent transactions", section: "Sections" },
] as const;

const KEY = "dashWidgets"; // remembered on this device
const load = (): Record<string, boolean> => { try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; } };

export function useWidgets() {
  const [s, set] = useState(load);
  const on = (k: string) => s[k] !== false; // everything is on by default
  const save = (n: Record<string, boolean>) => { set(n); try { localStorage.setItem(KEY, JSON.stringify(n)); } catch {} };
  return { on, toggle: (k: string) => save({ ...s, [k]: !on(k) }), reset: () => save({}) };
}
