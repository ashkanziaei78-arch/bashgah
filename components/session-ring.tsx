import { faDigits } from "@/lib/format";

const R = 44;
const CIRCUMFERENCE = 2 * Math.PI * R;

/** Progress ring showing sessions (or any count) left out of a total.
 *  A ring rather than a bar because it carries the number and the
 *  progress in the same space — which is all a phone card can spare.
 *
 *  The track is drawn full and the sweep animates up from empty on
 *  first paint (see `.fc-ring` in globals.css), so the figure arrives
 *  with its own progress instead of appearing already finished. */
export function SessionRing({
  left,
  total,
  label = "جلسه مانده",
  tone = "cyan",
}: {
  left: number | null;
  total: number | null;
  label?: string;
  /** Which token colours the sweep. Kept as a name rather than a CSS
   *  value so no page can hand this a literal. */
  tone?: "cyan" | "ok" | "warn";
}) {
  const unlimited = left === null || total === null || total === 0;
  const ratio = unlimited ? 1 : Math.min(1, Math.max(0, left / total));
  const stroke = `var(--color-fc-${tone})`;

  return (
    <div className="fc-ring relative grid size-[116px] shrink-0 place-items-center">
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 -rotate-90"
        aria-hidden="true"
        style={{ "--fc-ring-circumference": CIRCUMFERENCE } as React.CSSProperties}
      >
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--fc-track)" strokeWidth="7" />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke={stroke}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
          style={{ filter: `drop-shadow(0 0 6px ${stroke})` }}
        />
      </svg>
      <div className="text-center">
        <b className="fc-figure block text-3xl" style={{ color: stroke }}>
          {unlimited ? "∞" : faDigits(left)}
        </b>
        <small className="mt-1 block text-xs text-fc-muted">
          {unlimited ? "نامحدود" : label}
        </small>
      </div>
    </div>
  );
}
