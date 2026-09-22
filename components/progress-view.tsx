"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { ProgressLine, AttendanceBars, type Point } from "@/components/charts";
import { SectionHeading, StatRow } from "@/components/ui";
import { faDecimal, faDigits } from "@/lib/format";

export interface ExerciseSeries {
  name: string;
  points: Point[];
}

/** One exercise is charted at a time. A member's question is never "how
 *  do twelve lifts compare" — it is "am I lifting more than last month
 *  on this one" — and twelve lines on a phone answers neither. */
export function ProgressView({
  series,
  weeks,
  totals,
}: {
  series: ExerciseSeries[];
  weeks: Point[];
  totals: { sessions: number; volumeKg: number; bestLift: number | null };
}) {
  const [picked, setPicked] = useState(0);
  const current = series[picked];

  const first = current?.points[0]?.value ?? 0;
  const last = current?.points.at(-1)?.value ?? 0;
  const delta = Math.round((last - first) * 10) / 10;

  return (
    <>
      <StatRow
        stats={[
          { label: "جلسه‌ی ثبت‌شده", value: faDigits(totals.sessions), tone: "cyan" },
          {
            label: "کل وزنه (تن)",
            value: faDecimal(Math.round(totals.volumeKg / 100) / 10),
            tone: "ok",
          },
          {
            label: "سنگین‌ترین (کیلو)",
            value: totals.bestLift === null ? "—" : faDecimal(totals.bestLift),
            tone: "warn",
          },
        ]}
      />

      <SectionHeading>پیشرفت وزنه</SectionHeading>

      {/* The picker carries the series identity, so the chart needs no
          legend and no second colour. */}
      <div
        className="fc-picker fc-scroll"
        role="tablist"
        aria-label="انتخاب حرکت"
      >
        {series.map((s, i) => (
          <button
            key={s.name}
            type="button"
            role="tab"
            aria-selected={i === picked}
            onClick={() => setPicked(i)}
            className="fc-picker-btn"
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="fc-card mt-2.5 p-4">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <b className="truncate text-md">{current.name}</b>
          {current.points.length > 1 && (
            <span
              className={`fc-num shrink-0 text-sm ${
                delta > 0 ? "text-fc-ok" : delta < 0 ? "text-fc-muted" : "text-fc-dim"
              }`}
            >
              {delta > 0 ? "+" : ""}
              {faDecimal(delta)} کیلو
            </span>
          )}
        </div>
        <p className="mb-2 text-xs text-fc-dim">
          از اولین جلسه‌ی ثبت‌شده تا امروز
        </p>
        {current.points.length > 1 ? (
          <ProgressLine points={current.points} />
        ) : (
          <p className="py-6 text-center text-sm text-fc-muted">
            برای این حرکت فقط یک جلسه ثبت شده. جلسه‌ی بعد که وزنه‌ات را وارد کنی،
            خط پیشرفت شکل می‌گیرد.
          </p>
        )}
      </div>

      <SectionHeading>حضور در باشگاه</SectionHeading>
      <div className="fc-card p-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs text-fc-dim">
          <TrendingUp className="size-3.5 text-fc-cyan" aria-hidden />
جلسه در هر هفته. عددها یعنی «چند هفته پیش».
        </p>
        <AttendanceBars points={weeks} />
      </div>
    </>
  );
}
