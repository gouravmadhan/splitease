/** Two-colour ring: red = what I owe, green = what I'm owed. Display only; the numbers come from the API. */
export default function Ring({ owe, owed, value, sub, subTone }: { owe: number; owed: number; value: string; sub: string; subTone: "pay" | "receive" | "muted" }) {
  const R = 52, C = 2 * Math.PI * R, tot = owe + owed;
  const g = tot ? owed / tot : 0, p = tot ? owe / tot : 0;
  const arc = (len: number, off: number, color: string) => len > 0 && (
    <circle cx="60" cy="60" r={R} fill="none" strokeWidth="11" strokeLinecap="butt" strokeDasharray={`${len * C} ${C}`} strokeDashoffset={-off * C} style={{ stroke: color }} />);
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[210px]" role="img" aria-label={`${value}, ${sub}`}>
      <svg viewBox="0 0 120 120" className="h-full w-full">
        <g transform="rotate(-90 60 60)">
          <circle cx="60" cy="60" r={R} fill="none" strokeWidth="11" style={{ stroke: "hsl(var(--line))" }} />
          {arc(g, 0, "hsl(var(--receive))")}{arc(p, g, "hsl(var(--pay))")}
        </g>
      </svg>
      <div className="absolute inset-0 grid place-items-center px-6 text-center">
        <div><p className="text-xs text-muted">Overall balance</p>
          <p className="text-lg font-bold leading-tight sm:text-xl">{value}</p>
          <p className={`text-xs font-semibold ${subTone === "pay" ? "text-pay" : subTone === "receive" ? "text-receive" : "text-muted"}`}>{sub}</p></div>
      </div>
    </div>
  );
}
