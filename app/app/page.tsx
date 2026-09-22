import Link from "next/link";
import { Dumbbell, Apple, ChevronLeft, CalendarClock, Flame } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, getActiveMembership, sessionsLeft } from "@/lib/data";
import { SessionRing } from "@/components/session-ring";
import {
  SectionHeading,
  EmptyState,
  WeekStrip,
  StreakChip,
  streakFrom,
} from "@/components/ui";
import {
  faDigits,
  faNumber,
  faDateLong,
  daysUntil,
  faWeekdayIndex,
  sinceDaysAgo,
} from "@/lib/format";

export const metadata = { title: "خانه" };

export default async function Dashboard() {
  const profile = await requireProfile();
  const membership = await getActiveMembership(profile.id);
  const supabase = await createClient();

  const [{ data: program }, { data: diet }, { data: recentCheckins }] = await Promise.all([
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
  ]);

  const left = sessionsLeft(membership);
  const days = membership ? daysUntil(membership.expires_on) : 0;
  const used = membership?.sessions_used ?? 0;
  const total = membership?.sessions_total ?? null;

  // Which of the last seven weekdays had an entry
  const attended = new Set(
    (recentCheckins ?? []).map((c: { at: string }) => faWeekdayIndex(c.at))
  );
  const todayIndex = faWeekdayIndex(new Date());
  const streak = streakFrom(attended, todayIndex);

  const exerciseCount = program?.program_items?.[0]?.count ?? 0;
  const mealCount = diet?.diet_meals?.[0]?.count ?? 0;

  // Days run out before sessions do as often as the other way round, so
  // whichever is closer to zero is what the ring shows — a member with
  // 14 sessions left and 2 days left needs to see the 2.
  const daysAreTighter =
    total !== null && left !== null && total > 0 && days / 30 < left / total;

  return (
    <>
      <header className="flex items-center gap-3.5 pt-6 pb-4">
        <div className="fc-avatar size-11 text-sm" aria-hidden>
          {profile.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl">
            سلام {profile.full_name.split(" ")[0]}
          </h1>
          <p className="text-xs text-fc-dim">{faDateLong(new Date())}</p>
        </div>
      </header>

      {membership ? (
        <section className="fc-hero fc-rise flex items-center gap-5 p-5">
          <SessionRing
            left={daysAreTighter ? days : left}
            total={daysAreTighter ? 30 : total}
            label={daysAreTighter ? "روز مانده" : "جلسه مانده"}
            tone={daysAreTighter && days <= 5 ? "warn" : "cyan"}
          />
          <dl className="grid min-w-0 flex-1 gap-3">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <dt className="text-fc-muted">اشتراک</dt>
              <dd className="truncate font-extrabold">{membership.plans?.name}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <dt className="text-fc-muted">
                {daysAreTighter ? "جلسه مانده" : "روز باقی‌مانده"}
              </dt>
              <dd className="fc-num text-md">
                {daysAreTighter
                  ? left === null
                    ? "نامحدود"
                    : `${faDigits(left)} جلسه`
                  : `${faDigits(days)} روز`}
              </dd>
            </div>
            {total !== null && (
              <div className="grid gap-2">
                <div className="fc-bar">
                  <i style={{ width: `${Math.round((used / total) * 100)}%` }} />
                </div>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <dt className="text-fc-muted">مصرف‌شده</dt>
                  <dd className="fc-num text-sm">
                    {faDigits(used)} از {faDigits(total)}
                  </dd>
                </div>
              </div>
            )}
          </dl>
        </section>
      ) : (
        <EmptyState
          icon={CalendarClock}
          title="اشتراک فعالی ندارید"
          body="برای شروع تمرین، یکی از پلن‌های باشگاه را فعال کنید."
        >
          <Link href="/#plans" className="fc-btn fc-btn-block">
            دیدن پلن‌ها
          </Link>
        </EmptyState>
      )}

      <SectionHeading>تمرین امروز</SectionHeading>
      {program ? (
        <Link href="/app/workout" className="fc-card fc-card-link fc-rise flex items-center gap-3.5 p-4">
          <span className="grid size-13 shrink-0 place-items-center rounded-2xl border border-[var(--fc-line2)] bg-fc-navy2/60 text-fc-cyan">
            <Dumbbell className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block truncate text-md">{program.title}</b>
            <small className="text-xs text-fc-dim">
              <span className="fc-num">{faDigits(exerciseCount)}</span> حرکت
            </small>
          </span>
          <ChevronLeft className="size-5 text-fc-dim" aria-hidden />
        </Link>
      ) : (
        <EmptyState
          icon={Dumbbell}
          title="هنوز برنامه‌ای ندارید"
          body="از تب تمرین درخواست بدهید تا مربی یک تایم حضوری بگذارد و برنامه‌تان را بنویسد."
        >
          <Link href="/app/workout" className="fc-btn fc-btn-block">
            رفتن به تب تمرین
          </Link>
        </EmptyState>
      )}

      <SectionHeading>برنامه غذایی</SectionHeading>
      {diet ? (
        <Link href="/app/nutrition" className="fc-card fc-card-link fc-rise flex items-center gap-3.5 p-4">
          <span className="grid size-13 shrink-0 place-items-center rounded-2xl border border-[var(--fc-line2)] bg-fc-navy2/60 text-fc-ok">
            <Apple className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-md">
              <span className="fc-num">{faNumber(diet.target_kcal)}</span> کالری هدف
            </b>
            <small className="text-xs text-fc-dim">
              <span className="fc-num">{faDigits(mealCount)}</span> وعده
            </small>
          </span>
          <ChevronLeft className="size-5 text-fc-dim" aria-hidden />
        </Link>
      ) : (
        <EmptyState
          icon={Apple}
          title="هنوز برنامه غذایی ندارید"
          body="کالری روزانه‌تان از روی قد، وزن، سن و هدفتان حساب می‌شود. برای شروع یک تایم بگذارید."
        >
          <Link href="/app/nutrition" className="fc-btn fc-btn-block">
            رفتن به تب تغذیه
          </Link>
        </EmptyState>
      )}

      <div className="fc-shead">
        هفته‌ی اخیر
        {streak >= 2 && <StreakChip days={streak} />}
      </div>
      <WeekStrip attended={attended} todayIndex={todayIndex} />
      {attended.size > 0 ? (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-fc-dim">
          <Flame className="size-3.5 text-fc-warn" aria-hidden />
          این هفته <span className="fc-num">{faDigits(attended.size)}</span> جلسه
          تمرین کرده‌اید.
        </p>
      ) : (
        <p className="mt-2.5 text-xs text-fc-dim">
          این هفته هنوز ورودی ثبت نشده است.
        </p>
      )}

      <div className="h-8" />
    </>
  );
}
