import { Flame, Scale } from "lucide-react";
import { faDigits, faDayParts } from "@/lib/format";
import type { muscleShare, weeklyConsistency } from "@/lib/training";

type Share = ReturnType<typeof muscleShare>;
type Weekly = ReturnType<typeof weeklyConsistency>;

/** Which muscles the last month actually trained, and how steadily.
 *  Two plain bar lists: magnitude per category, one hue, numbers on the
 *  bars, so no legend and no colour key is needed. */
export function TrainingBalance({ share, weekly }: { share: Share; weekly: Weekly }) {
  const most = Math.max(1, ...weekly.series.map((w) => w.days));
  return (
    <>
      <h2 className="mt-6 mb-1 flex items-center gap-2 text-[14.5px]">
        <Flame className="size-4 text-fc-warn" />
        پایبندی هفتگی
      </h2>
      <p className="mb-3 text-[11.5px] text-fc-dim">
        روزهایی که تمرین ثبت کرده‌اید، هفته به هفته
        {weekly.streak > 1 && `، ${faDigits(weekly.streak)} هفته پشت سر هم`}
      </p>
      <div className="fc-card flex items-end gap-2 p-4">
        {weekly.series.map((w, i) => {
          const current = i === weekly.series.length - 1;
          const p = faDayParts(w.week);
          return (
            <div key={w.week} className="flex flex-1 flex-col items-center gap-1.5" title={`هفته‌ی ${p.day} ${p.month}: ${faDigits(w.days)} روز`}>
              <span className="fc-num text-[10.5px] font-bold text-fc-muted">{w.days ? faDigits(w.days) : ""}</span>
              <div className="flex h-16 w-full items-end">
                <i
                  className="block w-full rounded-[4px]"
                  style={{
                    height: w.days ? `${Math.max(12, (w.days / most) * 100)}%` : "6%",
                    background: w.days ? "var(--color-fc-cyan)" : "rgba(122,170,214,.16)",
                    opacity: w.days && !current ? 0.55 : 1,
                  }}
                />
              </div>
              <small className="text-[10px] whitespace-nowrap text-fc-dim">{current ? "اکنون" : p.day}</small>
            </div>
          );
        })}
      </div>

      {share.total > 0 && (
        <>
          <h2 className="mt-6 mb-1 flex items-center gap-2 text-[14.5px]">
            <Scale className="size-4 text-fc-cyan" />
            تعادل عضلات
          </h2>
          <p className="mb-3 text-[11.5px] text-fc-dim">
            حرکت‌های انجام‌شده در ۳۰ روز اخیر ({faDigits(share.total)} حرکت)، بر اساس گروه عضلانی
          </p>
          <ul className="fc-card grid list-none gap-3 p-4">
            {share.rows.map((r) => (
              <li key={r.muscle} className="grid gap-1.5">
                <span className="flex items-baseline justify-between text-[12.5px]">
                  <b>{r.muscle}</b>
                  <span className="fc-num text-fc-muted">{faDigits(Math.round(r.share * 100))}٪</span>
                </span>
                <div className="fc-bar" aria-hidden>
                  <i style={{ width: `${Math.round(r.share * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
