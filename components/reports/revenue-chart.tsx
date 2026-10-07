import { faDigits, faNumber } from "@/lib/format";
import type { MonthTotal } from "@/lib/analytics";

/** Compact toman: ۱۲٫۴ م for 12,400,000. Axis-free bars carry their own
 *  labels, so the figure has to fit above a 40px bar. */
export function shortToman(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${faDigits((n / 1_000_000_000).toFixed(1).replace(/\.0$/, "")).replace(".", "٫")} میلیارد`;
  if (abs >= 1_000_000) return `${faDigits((n / 1_000_000).toFixed(1).replace(/\.0$/, "")).replace(".", "٫")} م`;
  if (abs >= 1_000) return `${faDigits(Math.round(n / 1_000))} هزار`;
  return faDigits(n);
}

/** Money in per Jalali month. One series, one hue; the current month is
 *  the solid one, so "how is this month doing" is the first thing read.
 *  Labels sit on every bar because there are only six, and the exact
 *  figures are in the table underneath for anyone who needs them. */
export function RevenueChart({ months }: { months: MonthTotal[] }) {
  const W = 640;
  const H = 220;
  const top = 26;
  const base = H - 30;
  const max = Math.max(1, ...months.map((m) => m.total));
  const slot = W / months.length;
  const bw = Math.min(56, slot * 0.56);

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="درآمد ماهانه">
        <line x1={0} x2={W} y1={base} y2={base} stroke="var(--fc-line2)" strokeWidth={1} />
        {months.map((m, i) => {
          const h = Math.max(m.total > 0 ? 4 : 0, ((Math.max(0, m.total)) / max) * (base - top));
          // RTL: the newest month sits on the left end of the reading line.
          const x = W - (i + 0.5) * slot - bw / 2;
          const current = i === months.length - 1;
          return (
            <g key={m.key}>
              <title>{`${m.label}: ${faNumber(m.total)} تومان، ${faDigits(m.count)} پرداخت`}</title>
              {/* Generous hit area for the tooltip, larger than the bar. */}
              <rect x={x - (slot - bw) / 2} y={top - 20} width={slot} height={base - top + 44} fill="transparent" />
              <rect
                x={x}
                y={base - h}
                width={bw}
                height={h}
                rx={4}
                fill="var(--color-fc-cyan)"
                fillOpacity={current ? 1 : 0.42}
              />
              <text
                x={x + bw / 2}
                y={base - h - 8}
                textAnchor="middle"
                fontSize={12.5}
                fontWeight={current ? 800 : 600}
                fill={current ? "var(--color-fc-text)" : "var(--color-fc-muted)"}
              >
                {m.total ? shortToman(m.total) : "-"}
              </text>
              <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize={12.5} fill="var(--color-fc-muted)">
                {m.label}
              </text>
            </g>
          );
        })}
      </svg>
      <details className="mt-2 text-[12px] text-fc-muted">
        <summary className="cursor-pointer">جدول اعداد</summary>
        <table className="mt-2 w-full text-right">
          <thead>
            <tr className="text-fc-muted"><th className="py-1 font-medium">ماه</th><th className="font-medium">دریافتی</th><th className="font-medium">تعداد</th></tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.key} className="border-t border-[var(--fc-line)] text-fc-text">
                <td className="py-1.5">{m.label}</td>
                <td className="fc-num">{faNumber(m.total)}</td>
                <td className="fc-num">{faDigits(m.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
