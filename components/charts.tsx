"use client";

import { useId, useState } from "react";
import { faDigits, faDecimal } from "@/lib/format";

/* ============================================================
   Charts — one series each, on purpose.

   A member's question is never "how do twelve exercises compare";
   it is "am I lifting more than last month on *this* one". One
   series means one colour, no legend, and no rainbow to decode —
   the picker above the chart carries the identity instead.
   ============================================================ */

/* Time runs left → right even though the app is RTL.
   Mirroring the axis was tried first and it misleads: the demo series
   climbs 55 → 62.5kg, and drawn right-to-left that improvement renders
   as a line sloping *down* beside a label reading "+۷٫۵ کیلو". Chart
   convention — up and onward to the right — is near-universal and wins
   over text direction here. The axis labels stay Persian; only the
   plotting direction is LTR. */
const PAD = { top: 18, right: 14, bottom: 28, left: 38 };

/** Gridlines are hairline, solid and one step off the surface. Dashes
 *  read as "projection" when they are only a grid. */
function Grid({
  ticks,
  w,
  h,
  label,
}: {
  ticks: number[];
  w: number;
  h: number;
  label: (v: number) => string;
}) {
  return (
    <g aria-hidden>
      {ticks.map((t, i) => {
        const y = PAD.top + (1 - t) * (h - PAD.top - PAD.bottom);
        return (
          <g key={i}>
            <line
              x1={PAD.left}
              x2={w - PAD.right}
              y1={y}
              y2={y}
              stroke="var(--fc-line)"
              strokeWidth="1"
            />
            {/* Axis text wears a text token, never the series colour. */}
            <text
              x={PAD.left - 6}
              y={y + 3}
              textAnchor="end"
              className="fc-num"
              fontSize="10"
              fill="var(--color-fc-dim)"
            >
              {label(t)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export interface Point {
  /** Jalali label for the x axis, already Persian. */
  label: string;
  value: number;
}

/** Strength over time for one exercise. Line, 2px, round caps, markers
 *  ringed in the surface colour so they stay legible where they cross
 *  the line. Only the last point is direct-labelled — a number on every
 *  point is chaos and goes unread. */
export function ProgressLine({
  points,
  unit = "کیلو",
}: {
  points: Point[];
  unit?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const clip = useId();

  const w = 320;
  const h = 170;
  const innerW = w - PAD.left - PAD.right;
  const innerH = h - PAD.top - PAD.bottom;

  const values = points.map((p) => p.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  // A flat series would divide by zero and draw on the floor; give it a
  // band so the line sits mid-plot instead.
  const min = lo === hi ? lo - 5 : lo - (hi - lo) * 0.25;
  const max = lo === hi ? hi + 5 : hi + (hi - lo) * 0.25;

  const x = (i: number) =>
    PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * innerH;

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");
  const last = points.length - 1;
  const active = hover ?? last;

  return (
    <figure className="fc-chart">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="نمودار پیشرفت وزنه">
        <defs>
          <clipPath id={clip}>
            <rect x={PAD.left} y={0} width={innerW} height={h} />
          </clipPath>
          <linearGradient id={`${clip}-wash`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-fc-cyan)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--color-fc-cyan)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <Grid
          ticks={[0, 0.5, 1]}
          w={w}
          h={h}
          label={(t) => faDigits(Math.round(min + t * (max - min)))}
        />

        {/* The wash is a 10-16% hint, never a saturated block. */}
        <path
          d={`${path} L${x(last)},${h - PAD.bottom} L${x(0)},${h - PAD.bottom} Z`}
          fill={`url(#${clip}-wash)`}
          clipPath={`url(#${clip})`}
          aria-hidden
        />
        <path
          d={path}
          fill="none"
          stroke="var(--color-fc-cyan)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        />

        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={x(i)}
              cy={y(p.value)}
              r={i === active ? 5 : 3.5}
              fill="var(--color-fc-cyan)"
              stroke="var(--color-fc-ink2)"
              strokeWidth="2"
              aria-hidden
            />
            {/* The hit target is far bigger than the dot. */}
            <rect
              x={x(i) - innerW / Math.max(points.length, 2) / 2}
              y={0}
              width={innerW / Math.max(points.length, 2)}
              height={h}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          </g>
        ))}

        <text
          x={x(active)}
          y={Math.max(12, y(points[active].value) - 12)}
          textAnchor="middle"
          className="fc-num"
          fontSize="12"
          fontWeight="700"
          fill="var(--color-fc-text)"
        >
          {faDecimal(points[active].value)}
        </text>
        {[...new Set([0, last, active])].map((i) => (
          <text
            key={i}
            x={x(i)}
            y={h - 8}
            textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"}
            fontSize="10"
            fontWeight={i === active ? 700 : 400}
            fill={i === active ? "var(--color-fc-muted)" : "var(--color-fc-dim)"}
          >
            {points[i].label}
          </text>
        ))}
      </svg>
      <figcaption className="sr-only">
        آخرین وزنه: {faDecimal(points[last].value)} {unit}
      </figcaption>
    </figure>
  );
}

/** Sessions per week. Columns, capped thickness, 4px rounded cap and a
 *  square baseline, separated by surface gaps rather than strokes. */
export function AttendanceBars({ points }: { points: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const w = 320;
  const h = 150;
  const innerW = w - PAD.left - PAD.right;
  const innerH = h - PAD.top - PAD.bottom;
  const max = Math.max(1, ...points.map((p) => p.value));

  const band = innerW / points.length;
  // Capped, with the band's leftover left as air.
  const barW = Math.min(24, band - 6);

  return (
    <figure className="fc-chart">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="نمودار حضور هفتگی">
        <Grid ticks={[0, 1]} w={w} h={h} label={(t) => faDigits(Math.round(t * max))} />

        {points.map((p, i) => {
          const barH = (p.value / max) * innerH;
          const cx = PAD.left + (i + 0.5) * band;
          const top = PAD.top + innerH - barH;
          const on = hover === i;
          return (
            <g
              key={i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <rect x={cx - band / 2} y={0} width={band} height={h} fill="transparent" />
              {p.value > 0 && (
                <rect
                  x={cx - barW / 2}
                  y={top}
                  width={barW}
                  height={barH}
                  rx="4"
                  fill="var(--color-fc-cyan)"
                  opacity={on || hover === null ? 1 : 0.45}
                />
              )}
              {on && p.value > 0 && (
                <text
                  x={cx}
                  y={top - 5}
                  textAnchor="middle"
                  className="fc-num"
                  fontSize="11"
                  fontWeight="700"
                  fill="var(--color-fc-text)"
                >
                  {faDigits(p.value)}
                </text>
              )}
              <text
                x={cx}
                y={h - 8}
                textAnchor="middle"
                fontSize="9"
                fill="var(--color-fc-dim)"
              >
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
