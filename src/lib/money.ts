/** All money is integer paise. Convert only at the UI edges. */
export const rupeesToPaise = (r: number | string): number => {
  const n = typeof r === "string" ? parseFloat(r.replace(/,/g, "")) : r;
  if (!Number.isFinite(n)) throw new Error("Invalid amount");
  return Math.round(n * 100);
};

const inr = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const formatINR = (paise: number): string =>
  `${paise < 0 ? "-" : ""}₹${inr.format(Math.abs(paise) / 100)}`;

/** Balance convention: + = person pays, − = person receives. */
export function describeBalance(paise: number) {
  if (paise > 0) return { label: `Pays ${formatINR(paise)}`, tone: "pay" as const };
  if (paise < 0) return { label: `Gets ${formatINR(-paise)}`, tone: "receive" as const };
  return { label: "Settled", tone: "settled" as const };
}
