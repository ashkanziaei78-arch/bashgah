import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, getSetting } from "@/lib/data";
import { ClassCard } from "@/components/classes/class-card";
import { groupByDay, tehranDay, tehranWeek, type ScheduledClass } from "@/lib/classes";
import { faDayParts, faDigits } from "@/lib/format";

export const metadata = { title: "کلاس‌ها" };

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireProfile();
  const sp = await searchParams;
  // Two weeks are bookable by default, so only this week and the next
  // are offered; anything else would be a page of locked buttons.
  const offset = sp.w === "1" ? 1 : 0;
  const now = new Date();
  const week = tehranWeek(now, offset);

  const supabase = await createClient();
  const [{ data, error }, cancelWindowHours, horizonDays] = await Promise.all([
    supabase.rpc("class_schedule", { p_from: week.from, p_to: week.to }),
    getSetting<number>("class_cancel_window_hours", 2),
    getSetting<number>("class_booking_horizon_days", 14),
  ]);

  const classes = (data ?? []) as ScheduledClass[];
  const byDay = groupByDay(classes);
  const today = tehranDay(now);
  const mine = classes.filter((c) => !c.cancelled_at && (c.my_status === "booked" || c.my_status === "waitlisted"));

  return (
    <>
      <header className="flex items-center gap-3 pt-5 pb-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-fc-cyan/12 text-fc-cyan">
          <CalendarDays className="size-5" />
        </span>
        <div className="flex-1">
          <h1 className="text-lg">کلاس‌های گروهی</h1>
          <p className="text-xs text-fc-muted">
            {mine.length > 0
              ? `${faDigits(mine.length)} کلاس در برنامه‌ی شما این هفته`
              : "جایتان را از قبل رزرو کنید"}
          </p>
        </div>
      </header>

      <nav aria-label="هفته" className="mb-3 grid grid-cols-2 gap-2">
        <Link
          href="/app/classes"
          aria-current={offset === 0 ? "page" : undefined}
          className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl border text-[13px] font-bold ${
            offset === 0 ? "border-fc-cyan bg-fc-cyan/12 text-fc-cyan" : "border-[var(--fc-line2)] text-fc-muted"
          }`}
        >
          <ChevronRight className="size-4" />
          این هفته
        </Link>
        <Link
          href="/app/classes?w=1"
          aria-current={offset === 1 ? "page" : undefined}
          className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl border text-[13px] font-bold ${
            offset === 1 ? "border-fc-cyan bg-fc-cyan/12 text-fc-cyan" : "border-[var(--fc-line2)] text-fc-muted"
          }`}
        >
          هفته‌ی بعد
          <ChevronLeft className="size-4" />
        </Link>
      </nav>

      {/* The week at a glance: a dot under every day that has a class. */}
      <ol className="mb-4 grid list-none grid-cols-7 gap-1.5">
        {week.days.map((d) => {
          const p = faDayParts(d);
          const n = byDay.get(d)?.length ?? 0;
          const past = d < today;
          return (
            <li key={d}>
              <a
                href={n ? `#d-${d}` : undefined}
                className={`grid justify-items-center gap-0.5 rounded-xl border py-2 text-center ${
                  d === today ? "border-fc-cyan bg-fc-cyan/10" : "border-[var(--fc-line)]"
                } ${past ? "opacity-50" : ""}`}
              >
                <span className="text-[10.5px] text-fc-muted">{p.weekday.slice(0, 1)}</span>
                <b className="fc-num text-[15px]">{p.day}</b>
                <span
                  aria-label={n ? `${faDigits(n)} کلاس` : "بدون کلاس"}
                  className={`size-1.5 rounded-full ${n ? "bg-fc-cyan" : "bg-transparent"}`}
                />
              </a>
            </li>
          );
        })}
      </ol>

      {error && (
        <p role="alert" className="fc-card p-4 text-center text-[13px] text-fc-bad">
          برنامه‌ی کلاس‌ها بارگذاری نشد. دوباره امتحان کنید.
        </p>
      )}

      {!error && classes.length === 0 && (
        <div className="fc-card grid justify-items-center gap-2 p-8 text-center">
          <CalendarDays className="size-8 text-fc-dim" />
          <p className="text-[14px] font-bold">این هفته کلاسی در برنامه نیست</p>
          <p className="text-[12.5px] text-fc-muted">برنامه‌ی هفته‌ی بعد را ببینید یا از پذیرش بپرسید.</p>
        </div>
      )}

      <div className="grid gap-5 pb-8">
        {[...byDay.entries()].map(([day, list]) => {
          const p = faDayParts(day);
          return (
            <section key={day} id={`d-${day}`} className="scroll-mt-4">
              <h2 className="mb-2.5 flex items-baseline gap-2 text-[14px]">
                {day === today ? "امروز" : p.weekday}
                <span className="text-[12px] font-medium text-fc-muted">
                  {p.day} {p.month}
                </span>
              </h2>
              <div className="grid gap-3">
                {list.map((c) => (
                  <ClassCard
                    key={c.id}
                    c={c}
                    nowIso={now.toISOString()}
                    cancelWindowHours={cancelWindowHours}
                    horizonDays={horizonDays}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
