import { Flame, Dumbbell, CalendarDays, Trophy } from "lucide-react";
import { faNumber, faDigits } from "@/lib/format";
import { SOURCE_LABEL, type BurnSource, type BurnSummary } from "@/lib/gym-burn";

const WEEKDAY = ["ی", "د", "س", "چ", "پ", "ج", "ش"]; // Sunday first, matching getUTCDay

const SOURCE_ICON: Record<BurnSource, typeof Flame> = {
  workout: Dumbbell,
  class: CalendarDays,
  event: Trophy,
};

/** What the gym saw the member burn. Deliberately not added to the
 *  daily target: the target already assumes their activity level, and
 *  folding this in twice would tell them to eat for the same session
 *  two times over. */
export function GymBurnCard({ summary, hasWeight }: { summary: BurnSummary; hasWeight: boolean }) {
  const peak = Math.max(1, ...summary.byDay.map((d) => d.kcal));

  return (
    <section className="fc-card mt-3.5 p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-lg"
          style={{ background: "linear-gradient(135deg,#ff8a3d,#f5b942)" }}
        >
          <Flame className="size-[18px] text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <b className="block text-[13.5px]">کالری سوزانده در باشگاه</b>
          <small className="text-[11px] text-fc-dim">
            فقط تمرین، کلاس و رویدادهایی که در باشگاه ثبت شده
          </small>
        </div>
      </div>

      {!hasWeight ? (
        <p className="text-[12.5px] leading-relaxed text-fc-muted">
          برای حساب کالری، وزنتان باید در پرونده ثبت شده باشد. از مربی بخواهید وزن شما را وارد کند.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-fc-navy2/50 px-2 py-2.5">
              <b className="fc-lat fc-num block text-[17px] font-extrabold text-[#ff8a3d]">
                {faNumber(summary.today)}
              </b>
              <small className="text-[10.5px] text-fc-dim">امروز</small>
            </div>
            <div className="rounded-xl bg-fc-navy2/50 px-2 py-2.5">
              <b className="fc-lat fc-num block text-[17px] font-extrabold">{faNumber(summary.total)}</b>
              <small className="text-[10.5px] text-fc-dim">۷ روز اخیر</small>
            </div>
            <div className="rounded-xl bg-fc-navy2/50 px-2 py-2.5">
              <b className="fc-lat fc-num block text-[17px] font-extrabold">
                {faDigits(summary.activeDays)}
              </b>
              <small className="text-[10.5px] text-fc-dim">روز فعال</small>
            </div>
          </div>

          <div className="mt-3.5 flex h-16 items-end gap-1.5" aria-hidden>
            {summary.byDay.map((d) => {
              const wd = new Date(`${d.day}T00:00:00Z`).getUTCDay();
              return (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-md"
                    style={{
                      height: `${Math.max(4, (d.kcal / peak) * 48)}px`,
                      background: d.kcal > 0 ? "linear-gradient(180deg,#f5b942,#ff8a3d)" : "var(--fc-line2)",
                    }}
                  />
                  <small className="text-[10px] text-fc-dim">{WEEKDAY[wd]}</small>
                </div>
              );
            })}
          </div>

          {summary.total > 0 && (
            <ul className="mt-3 flex list-none flex-wrap gap-1.5 p-0">
              {(Object.keys(summary.bySource) as BurnSource[])
                .filter((s) => summary.bySource[s] > 0)
                .map((s) => {
                  const Icon = SOURCE_ICON[s];
                  return (
                    <li key={s} className="fc-chip">
                      <Icon className="size-3.5" />
                      {SOURCE_LABEL[s]}
                      {/* A middle dot reads as a Persian zero next to digits. */}
                      <b className="fc-lat fc-num font-extrabold">{faNumber(summary.bySource[s])}</b>
                    </li>
                  );
                })}
            </ul>
          )}

          {summary.total === 0 && (
            <p className="mt-3 text-[12px] text-fc-muted">
              این هفته هنوز تمرینی در باشگاه ثبت نشده. بعد از تمرین، حرکت‌ها را در صفحه‌ی تمرین تیک بزنید.
            </p>
          )}
        </>
      )}
    </section>
  );
}
