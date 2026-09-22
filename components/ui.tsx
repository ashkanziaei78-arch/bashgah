import type { ComponentType, ReactNode } from "react";
import { faDigits } from "@/lib/format";

/** Section heading with a hairline that runs out to the edge of the
 *  column. A stack of these reads as separated without spending the
 *  vertical space a full divider would cost on a phone. */
export function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="fc-shead">{children}</h2>;
}

/** The answer a screen gives when there is nothing to show yet.
 *
 *  For most new members this is the *first* thing they see on three of
 *  the five tabs, so it gets an icon, a real heading and the action
 *  that resolves it — not the bare paragraph the first pass shipped. */
export function EmptyState({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="fc-empty fc-rise">
      <span className="fc-empty-icon" aria-hidden>
        <Icon className="size-6" strokeWidth={1.7} />
      </span>
      <h2>{title}</h2>
      <p>{body}</p>
      {children && <div className="mt-2 w-full max-w-[300px]">{children}</div>}
    </div>
  );
}

export interface Stat {
  label: string;
  value: string;
  tone?: "text" | "cyan" | "ok" | "warn" | "bad";
}

/** Three-up row of figures. The figure leads and the label sits under
 *  it — the first pass had a 16px figure over a 10.5px label, which read
 *  as a footnote rather than a statistic. */
export function StatRow({ stats }: { stats: Stat[] }) {
  return (
    <div
      className="fc-stagger mt-3.5 grid gap-2.5"
      style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
    >
      {stats.map((s) => (
        <div key={s.label} className="fc-stat">
          <b style={{ color: `var(--color-fc-${s.tone ?? "text"})` }}>{s.value}</b>
          <small>{s.label}</small>
        </div>
      ))}
    </div>
  );
}

const WEEK = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

/** The last seven weekdays, Saturday first, with the attended ones
 *  filled. Today is ringed whether or not it was attended, so the strip
 *  answers "where am I in the week" as well as "what did I do".
 *
 *  Days after today are dimmed rather than drawn as misses — a Thursday
 *  that has not happened yet is not a skipped session. */
export function WeekStrip({
  attended,
  todayIndex,
}: {
  attended: Set<number>;
  todayIndex: number;
}) {
  return (
    <div className="fc-card p-4">
      <div className="fc-week">
        {WEEK.map((day, i) => {
          const here = attended.has(i);
          const future = i > todayIndex;
          return (
            <div
              key={day}
              className={`fc-week-col${i === todayIndex ? " fc-week-today" : ""}`}
            >
              <div className="fc-week-track" aria-hidden>
                {here && (
                  <i
                    className="fc-week-fill block"
                    style={{ height: "100%", animationDelay: `${i * 55}ms` }}
                  />
                )}
              </div>
              <span className={`fc-week-day${future ? " opacity-45" : ""}`}>{day}</span>
              <span className="sr-only">
                {here ? `${day}: تمرین ثبت شد` : `${day}: بدون تمرین`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Consecutive attended days counting back from today. Shown next to the
 *  week strip because "۴ روز پشت سر هم" is the single line most likely to
 *  bring somebody back tomorrow. */
export function streakFrom(attended: Set<number>, todayIndex: number): number {
  let n = 0;
  for (let i = todayIndex; i >= 0; i--) {
    if (!attended.has(i)) break;
    n++;
  }
  return n;
}

export function StreakChip({ days }: { days: number }) {
  if (days < 2) return null;
  return (
    <span className="fc-chip fc-chip-warn">
      <span className="fc-num">{faDigits(days)}</span> روز پشت سر هم
    </span>
  );
}
