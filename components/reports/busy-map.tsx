import { faDigits } from "@/lib/format";
import { HOURS } from "@/lib/analytics";

const DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

/** Door entries by weekday and hour. Magnitude, so one hue from the
 *  surface up to full cyan; an empty hour is the surface itself rather
 *  than a faint tint, so "nobody" never reads as "a few". */
export function BusyMap({ grid, max }: { grid: number[][]; max: number }) {
  return (
    <figure className="m-0">
      <div className="fc-scroll overflow-x-auto">
        <table className="w-full min-w-[560px] table-fixed border-separate" style={{ borderSpacing: 2 }}>
          <caption className="sr-only">ورود اعضا بر اساس روز هفته و ساعت</caption>
          <thead>
            <tr>
              <th className="w-[72px]" />
              {HOURS.map((h) => (
                <th key={h} scope="col" className="fc-num pb-1 text-center text-[10px] font-medium text-fc-muted">
                  {h % 3 === 0 ? faDigits(h) : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, d) => (
              <tr key={d}>
                <th scope="row" className="pe-2 text-right text-[11px] font-medium whitespace-nowrap text-fc-muted">
                  {DAYS[d]}
                </th>
                {row.map((n, i) => (
                  <td
                    key={i}
                    title={`${DAYS[d]} ساعت ${faDigits(HOURS[i])}: ${faDigits(n)} ورود`}
                    className="h-6 rounded-[4px]"
                    style={{
                      background:
                        n === 0
                          ? "rgba(122,170,214,.07)"
                          : `color-mix(in srgb, var(--color-fc-cyan) ${Math.round(18 + (n / Math.max(1, max)) * 82)}%, var(--color-fc-ink))`,
                    }}
                  >
                    <span className="sr-only">{faDigits(n)}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="mt-2 flex items-center gap-2 text-[11px] text-fc-muted">
        کم
        <span
          aria-hidden
          className="h-2 w-28 rounded-full"
          style={{ background: "linear-gradient(270deg, color-mix(in srgb, var(--color-fc-cyan) 18%, var(--color-fc-ink)), var(--color-fc-cyan))" }}
        />
        زیاد
      </figcaption>
    </figure>
  );
}
