import { faDate, faDigits } from "@/lib/format";

export interface WeightPoint {
  /** ISO date, oldest first. */
  on: string;
  value: number;
}

/** Weight over time.
 *
 *  One series, so there is no legend — the heading names it — and one
 *  colour. Time runs left to right: a member's first question is "am I
 *  going down?", and the trend is also written out in words above the
 *  chart so the answer never depends on reading the direction right.
 *
 *  Points are placed by date rather than by index. Somebody who weighs
 *  themselves twice in one week and then not for a month has a flat
 *  stretch, and evenly spacing those readings would draw a steady
 *  decline that did not happen.
 *
 *  The list underneath this chart on the page is its table view: every
 *  value is readable there, so nothing here is reachable only by
 *  hovering — which matters most on the phones this is used from.
 */
export function WeightChart({
  points,
  unit = "کیلو",
}: {
  points: WeightPoint[];
  unit?: string;
}) {
  // Two points are the fewest that can show a direction.
  if (points.length < 2) return null;

  const W = 420;
  const H = 150;
  const TOP = 12;
  const BOTTOM = 106; // plot floor; below this is the date band
  const LEFT = 8;
  const RIGHT = W - 8;

  const values = points.map((p) => p.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);

  // A member holding steady still deserves a readable line rather than
  // one pinned to the floor of the box.
  const pad = Math.max((rawMax - rawMin) * 0.18, 0.8);
  const min = rawMin - pad;
  const max = rawMax + pad;

  const times = points.map((p) => new Date(p.on).getTime());
  const t0 = times[0];
  const span = Math.max(times[times.length - 1] - t0, 1);

  const x = (t: number) => LEFT + ((t - t0) / span) * (RIGHT - LEFT);
  const y = (v: number) => BOTTOM - ((v - min) / (max - min)) * (BOTTOM - TOP);

  const coords = points.map((p, i) => ({ ...p, cx: x(times[i]), cy: y(p.value) }));
  const line = coords.map((c) => `${c.cx.toFixed(1)},${c.cy.toFixed(1)}`).join(" ");
  const area = `${LEFT},${BOTTOM} ${line} ${RIGHT},${BOTTOM}`;

  const last = coords[coords.length - 1];
  const lowest = coords.reduce((a, b) => (b.value < a.value ? b : a));
  const highest = coords.reduce((a, b) => (b.value > a.value ? b : a));

  // Direct-label only the ends of the range and the latest reading —
  // a number beside every dot is unreadable and goes unread.
  const labelled = new Set([lowest, highest, last]);

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`نمودار وزن از ${faDate(points[0].on)} تا ${faDate(last.on)}، از ${faDigits(rawMax)} به ${faDigits(last.value)} ${unit}`}
        className="block"
      >
        <defs>
          <linearGradient id="fc-weight-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00b2e3" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#00b2e3" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Solid hairlines one shade off the surface — never dashed,
            which reads as a threshold rather than a grid. */}
        {[0, 0.5, 1].map((f) => {
          const gy = TOP + f * (BOTTOM - TOP);
          return (
            <line
              key={f}
              x1={LEFT}
              x2={RIGHT}
              y1={gy}
              y2={gy}
              stroke="rgba(122,170,214,.16)"
              strokeWidth="1"
            />
          );
        })}

        <polyline points={area} fill="url(#fc-weight-fill)" stroke="none" />
        <polyline
          points={line}
          fill="none"
          stroke="#00b2e3"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {coords.map((c, i) => (
          <circle
            key={`${c.on}-${i}`}
            cx={c.cx}
            cy={c.cy}
            r={c === last ? 4.5 : 3}
            fill={c === last ? "#00b2e3" : "#071a2e"}
            stroke="#00b2e3"
            strokeWidth="2"
          />
        ))}

        {coords
          .filter((c) => labelled.has(c))
          .map((c, i) => (
            <text
              key={`l-${c.on}-${i}`}
              x={Math.min(Math.max(c.cx, 22), RIGHT - 22)}
              y={c.cy - 9}
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill="#e8f3fb"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {faDigits(c.value)}
            </text>
          ))}

        {/* The date band is inside the box on purpose: a container sized
            to the plot alone clips these and grows a nested scrollbar. */}
        <text x={LEFT} y={H - 12} textAnchor="start" fontSize="11" fill="#6e90b0">
          {faDate(points[0].on)}
        </text>
        <text x={RIGHT} y={H - 12} textAnchor="end" fontSize="11" fill="#6e90b0">
          {faDate(last.on)}
        </text>
      </svg>
    </figure>
  );
}
