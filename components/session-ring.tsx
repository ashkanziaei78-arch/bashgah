import { faDigits } from "@/lib/format";

const R = 42;
const CIRCUMFERENCE = 2 * Math.PI * R;

/** Progress ring showing sessions (or any count) left out of a total.
 *  A ring rather than a bar because it carries the number and the
 *  progress in the same 96px — which is all a phone card can spare. */
export function SessionRing({
  left,
  total,
  label = "جلسه مانده",
  color = "var(--color-fc-cyan)",
}: {
  left: number | null;
  total: number | null;
  label?: string;
  color?: string;
}) {
  const unlimited = left === null || total === null || total === 0;
  const ratio = unlimited ? 1 : Math.min(1, Math.max(0, left / total));

  return (
    <div className="relative grid size-24 shrink-0 place-items-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--fc-track)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
        />
      </svg>
      <div className="text-center">
        <b className="fc-lat block text-[25px] leading-none font-extrabold">
          {unlimited ? "∞" : faDigits(left)}
        </b>
        <small className="mt-0.5 block text-[10.5px] text-fc-muted">
          {unlimited ? "نامحدود" : label}
        </small>
      </div>
    </div>
  );
}
