import Link from "next/link";
import { Dumbbell, Apple, ChevronLeft, CalendarClock, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, getActiveMembership, sessionsLeft } from "@/lib/data";
import { SessionRing } from "@/components/session-ring";
import {
  faDigits,
  faDateLong,
  daysUntil,
  faWeekdayIndex,
  sinceDaysAgo,
} from "@/lib/format";

export const metadata = { title: "خانه" };

const WEEK = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export default async function Dashboard() {
  const profile = await requireProfile();
  const membership = await getActiveMembership(profile.id);
  const supabase = await createClient();

  const [{ data: program }, { data: diet }, { data: recentCheckins }, { count: weighIns }] =
    await Promise.all([
    supabase
      .from("programs")
      .select("id, title, program_items(count)")
      .eq("student_id", profile.id)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("diet_plans")
      .select("id, target_kcal, diet_meals(count)")
      .eq("student_id", profile.id)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("checkins")
      .select("at")
      .eq("student_id", profile.id)
      .eq("kind", "in")
      .gte("at", sinceDaysAgo(7)),
    supabase
      .from("body_metrics")
      .select("measured_on", { count: "exact", head: true })
      .eq("student_id", profile.id),
  ]);

  // `head: true` returns a count and no rows; it is null if the count
  // could not be taken, which reads the same as "nothing logged yet".
  const readings = weighIns ?? 0;

  const left = sessionsLeft(membership);
  const days = membership ? daysUntil(membership.expires_on) : 0;
  const used = membership?.sessions_used ?? 0;
  const total = membership?.sessions_total ?? null;

  // Which of the last seven weekdays had an entry
  const attended = new Set(
    (recentCheckins ?? []).map((c: { at: string }) => faWeekdayIndex(c.at))
  );

  const exerciseCount = program?.program_items?.[0]?.count ?? 0;
  const mealCount = diet?.diet_meals?.[0]?.count ?? 0;

  return (
    <>
      <header className="flex items-center gap-3 pt-5 pb-3.5">
        <Link
          href="/account"
          aria-label="حساب کاربری"
          className="fc-lat grid size-[38px] shrink-0 place-items-center rounded-full text-[13px] font-extrabold text-white"
          style={{ background: "var(--fc-grad)" }}
        >
          {profile.full_name.split(" ").map((w) => w[0]).slice(0, 2).join(" ")}
        </Link>
        <div className="flex-1">
          <h1 className="text-lg">سلام {profile.full_name.split(" ")[0]}</h1>
          <p className="text-xs text-fc-dim">{faDateLong(new Date())}</p>
        </div>
      </header>

      {/* A week's warning, and only a week's — a banner that is always
          there stops being read. Sessions running out counts too: on a
          twelve-session plan that is what ends first. */}
      {membership && (days <= 7 || (left !== null && left <= 2)) && (
        <Link
          href="/#plans"
          className="mb-3.5 flex items-center gap-3 rounded-[var(--radius-fc)] border border-fc-warn/40 bg-fc-warn/10 p-3.5"
        >
          <CalendarClock className="size-[18px] shrink-0 text-fc-warn" />
          <span className="min-w-0 flex-1">
            <b className="block text-[13px] text-fc-warn">
              {days === 0
                ? "اشتراکتان امروز تمام می‌شود"
                : left !== null && left <= 2 && days > 7
                  ? `${faDigits(left)} جلسه بیشتر نمانده`
                  : `${faDigits(days)} روز تا پایان اشتراک`}
            </b>
            <small className="text-[11.5px] text-fc-muted">
              برای تمدید با پذیرش باشگاه صحبت کنید تا وقفه نیفتد.
            </small>
          </span>
        </Link>
      )}

      {membership ? (
        <section className="fc-raised flex items-center gap-4.5 p-5">
          <SessionRing left={left} total={total} />
          <dl className="grid min-w-0 flex-1 gap-2.5">
            <div className="flex items-baseline justify-between text-[13px]">
              <dt className="text-fc-muted">اشتراک</dt>
              <dd className="text-[13.5px] font-extrabold">{membership.plans?.name}</dd>
            </div>
            <div className="flex items-baseline justify-between text-[13px]">
              <dt className="text-fc-muted">روز باقی‌مانده</dt>
              <dd className="fc-lat fc-num text-[14.5px] font-extrabold">
                {faDigits(days)} روز
              </dd>
            </div>
            {total !== null && (
              <>
                <div className="fc-bar">
                  <i style={{ width: `${Math.round((used / total) * 100)}%` }} />
                </div>
                <div className="flex items-baseline justify-between text-[13px]">
                  <dt className="text-fc-muted">مصرف‌شده</dt>
                  <dd className="fc-lat fc-num text-[14.5px] font-extrabold">
                    {faDigits(used)} از {faDigits(total)}
                  </dd>
                </div>
              </>
            )}
          </dl>
        </section>
      ) : (
        <section className="fc-raised p-6 text-center">
          <CalendarClock className="mx-auto mb-3 size-9 text-fc-dim" />
          <h2 className="mb-1.5 text-base">اشتراک فعالی ندارید</h2>
          <p className="mb-5 text-[13px] text-fc-muted">
            برای شروع تمرین، یکی از پلن‌های باشگاه را فعال کنید.
          </p>
          <Link href="/#plans" className="fc-btn">
            دیدن پلن‌ها
          </Link>
        </section>
      )}

      <h2 className="mt-6 mb-3 text-[14.5px]">تمرین امروز</h2>
      {program ? (
        <Link
          href="/app/workout"
          className="fc-card flex items-center gap-3 p-3.5 transition-colors hover:border-[var(--fc-line2)]"
        >
          <span className="grid size-13 shrink-0 place-items-center rounded-xl border border-[var(--fc-line2)] bg-fc-navy2/60 text-fc-cyan">
            <Dumbbell className="size-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-[13.5px]">{program.title}</b>
            <small className="fc-lat text-[11px] tracking-[0.05em] text-fc-dim">
              {faDigits(exerciseCount)} حرکت
            </small>
          </span>
          <ChevronLeft className="size-[18px] text-fc-dim" />
        </Link>
      ) : (
        <p className="fc-card p-4 text-[13px] text-fc-muted">
          هنوز برنامه‌ای برایتان ثبت نشده. از تب تمرین درخواست بدهید.
        </p>
      )}

      <h2 className="mt-6 mb-3 text-[14.5px]">برنامه غذایی</h2>
      {diet ? (
        <Link
          href="/app/nutrition"
          className="fc-card flex items-center gap-3 p-3.5 transition-colors hover:border-[var(--fc-line2)]"
        >
          <span className="grid size-13 shrink-0 place-items-center rounded-xl border border-[var(--fc-line2)] bg-fc-navy2/60 text-fc-cyan">
            <Apple className="size-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <b className="fc-num block text-[13.5px]">
              {faDigits(diet.target_kcal.toLocaleString("en-US").replace(/,/g, "٬"))} کالری هدف
            </b>
            <small className="fc-lat text-[11px] tracking-[0.05em] text-fc-dim">
              {faDigits(mealCount)} وعده
            </small>
          </span>
          <ChevronLeft className="size-[18px] text-fc-dim" />
        </Link>
      ) : (
        <p className="fc-card p-4 text-[13px] text-fc-muted">
          هنوز برنامه غذایی ثبت نشده. از تب تغذیه درخواست بدهید.
        </p>
      )}

      <h2 className="mt-6 mb-3 text-[14.5px]">پیشرفت</h2>
      <Link
        href="/app/progress"
        className="fc-card flex items-center gap-3 p-3.5 transition-colors hover:border-[var(--fc-line2)]"
      >
        <span className="grid size-13 shrink-0 place-items-center rounded-xl border border-[var(--fc-line2)] bg-fc-navy2/60 text-fc-cyan">
          <TrendingUp className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <b className="block text-[13.5px]">
            {readings === 0
              ? "وزنتان را ثبت کنید"
              : `${faDigits(readings)} اندازه‌گیری ثبت شده`}
          </b>
          <small className="text-[11px] text-fc-dim">
            {readings === 0
              ? "تا نمودار تغییر وزن شکل بگیرد"
              : "نمودار وزن، آنالیز بدنی و رکوردهای تمرینی"}
          </small>
        </span>
        <ChevronLeft className="size-[18px] text-fc-dim" />
      </Link>

      <h2 className="mt-6 mb-3 text-[14.5px]">هفته‌ی اخیر</h2>
      <div className="fc-card flex h-[106px] items-end justify-between gap-1.5 p-4">
        {WEEK.map((d, i) => {
          const here = attended.has(i);
          return (
            <div key={d} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-13 w-full items-end">
                <i
                  className="block w-full rounded-full"
                  style={{
                    height: here ? "100%" : "14%",
                    background: here ? "var(--fc-grad)" : "rgba(122,170,214,.16)",
                  }}
                />
              </div>
              <small className="text-[10.5px] text-fc-dim">{d}</small>
            </div>
          );
        })}
      </div>

      <div className="h-6" />
    </>
  );
}
