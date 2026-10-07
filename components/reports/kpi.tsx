import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { faDigits } from "@/lib/format";

/** One headline number. The tile is the chart here: a single figure
 *  does not need axes. */
export function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  delta,
  tone = "cy",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  /** Percent change against the previous period, if there is one. */
  delta?: number | null;
  tone?: "cy" | "ok" | "warn" | "bad";
}) {
  const color = {
    cy: "var(--color-fc-cyan)",
    ok: "var(--color-fc-ok)",
    warn: "var(--color-fc-warn)",
    bad: "var(--color-fc-bad)",
  }[tone];
  return (
    <div className="fc-card flex flex-col gap-2 p-4">
      <span className="flex items-center gap-2 text-[12px] text-fc-muted">
        <span
          aria-hidden
          className="grid size-8 place-items-center rounded-xl"
          style={{ color, background: `color-mix(in srgb, ${color} 13%, transparent)` }}
        >
          <Icon className="size-4" />
        </span>
        {label}
      </span>
      <b className="fc-num text-[22px] leading-none font-black">{value}</b>
      {(hint || delta !== undefined) && (
        <span className="flex flex-wrap items-center gap-2 text-[11.5px] text-fc-muted">
          {delta !== undefined && delta !== null && (
            <span className={`inline-flex items-center gap-0.5 font-bold ${delta >= 0 ? "text-fc-ok" : "text-fc-bad"}`}>
              {delta >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {faDigits(Math.abs(delta))}٪
            </span>
          )}
          {hint}
        </span>
      )}
    </div>
  );
}
