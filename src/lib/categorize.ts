/**
 * Keyword-based category detection. Pure and frontend-only: no API call per keystroke.
 * To add a category or keyword, edit CATEGORY_RULES (categories must also exist in CATEGORIES in types.ts).
 */
/** A "weak" keyword is generic (e.g. "contribution"): it only decides the category when no other category has a strong match. */
export type Keyword = string | { word: string; weak: true };
export type CategoryRule = { category: string; keywords: Keyword[] };

// Array order is the last tie-break priority.
export const CATEGORY_RULES: CategoryRule[] = [
  { category: "Fuel", keywords: ["petrol", "diesel", "fuel"] },
  { category: "Food", keywords: ["lunch", "dinner", "breakfast", "dhaba", "restaurant", "cafe", "food"] },
  { category: "Stay", keywords: ["stay", "hotel", "room", "accommodation"] },
  { category: "Travel", keywords: ["auto", "rickshaw", "cab", "taxi", "traveller", "travel", "bus", "train", "railway", "metro"] },
  { category: "Donation", keywords: ["donation", "donate", "donated", "charity", "charitable", "fundraising", "temple donation", "mandir donation",
    "religious donation", "ngo", "seva", "chanda", { word: "contribution", weak: true }] },
];
/** If this category matches at all it always wins (Petrol/Diesel must never become Travel). */
export const DOMINANT_CATEGORY = "Fuel";

// Lower-case, strip accents and punctuation, collapse repeated spaces.
const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Whole words or phrases only ("auto" will not match "automatic"); an optional plural suffix is allowed.
const compiled = CATEGORY_RULES.map((r, order) => ({
  category: r.category, order,
  patterns: r.keywords.map((k) => {
    const word = typeof k === "string" ? k : k.word;
    return { weak: typeof k !== "string", re: new RegExp(`(?:^| )${norm(word)}(?:es|s)?(?= |$)`) };
  }),
}));

/**
 * Returns the detected category, or null when nothing matches (callers then keep the current category).
 * Rule: Fuel wins outright. Otherwise the category with most matched keywords wins;
 * ties go to the keyword that appears first in the title, then to rule order.
 * Weak keywords are only used when there is no strong match anywhere, so "Contribution for dinner" stays Food.
 */
export function detectCategory(title: string): string | null {
  const text = norm(title);
  if (!text) return null;
  const score = (weak: boolean) => compiled.map((c) => {
    let count = 0, first = Infinity;
    for (const p of c.patterns) { if (p.weak !== weak) continue; const m = p.re.exec(text); if (m) { count++; first = Math.min(first, m.index); } }
    return { category: c.category, order: c.order, count, first };
  }).filter((h) => h.count > 0);
  const hits = score(false).length ? score(false) : score(true);
  if (!hits.length) return null;
  const dominant = hits.find((h) => h.category === DOMINANT_CATEGORY);
  if (dominant) return dominant.category;
  hits.sort((a, b) => b.count - a.count || a.first - b.first || a.order - b.order);
  return hits[0].category;
}
