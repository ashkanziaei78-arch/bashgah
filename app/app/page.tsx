import Link from "next/link";
import { Dumbbell, Apple, ChevronLeft, CalendarClock, TrendingUp, CalendarDays, Snowflake, Trophy } from "lucide-react";
import { KindIcon } from "@/components/classes/kind-icon";
import { AnnouncementCard } from "@/components/engage/tone";
import { tehranClock, type ClassKind } from "@/lib/classes";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, getCurrentMembership, sessionsLeft, getGym } from "@/lib/data";
import { EventIcon } from "@/components/events/event-icon";
import type { ListedEvent } from "@/lib/events";
import { SessionRing } from "@/components/session-ring";
import {
  faDigits,
  faDateLong,
  daysUntil,
  faWeekdayIndex,
  sinceDaysAgo,
  faDayParts,
} from "@/lib/format";

export const metadata = { title: "خانه" };

const WEEK = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export default async function Dashboard() {
  const profile = await requireProfile();
  const [membership, gym] = await Promise.all([getCurrentMembership(profile.id), getGym()]);
  const frozen = membership?.status === "frozen";
  const supabase = await createClient();

  const [
    { data: program },
    { data: diet },
    { data: recentCheckins },
    { count: weighIns },
    { data: myClasses },
    { data: news },
    { data: events },
  ] = await Promise.all([
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
    supabase
      .from("class_bookings")
      .select("status, class_sessions!inner(id, title, kind, starts_at, cancelled_at)")
      .eq("student_id", profile.id)
      .in("status", ["booked", "waitlisted"])
      .gte("class_sessions.starts_at", new Date().toISOString())
      .is("class_sessions.cancelled_at", null)
      .limit(20),
    // RLS already limits a member to what is live today.
    supabase
      .from("announcements")
      .select("id, title, body, tone")
      .order("pinned", { ascending: false })
      .order("publish_from", { ascending: false })
      .limit(3),
    gym?.events_enabled
      ? supabase.rpc("event_list", { p_from: new Date().toISOString() })
      : Promise.resolve({ data: [] }),
  ]);
  const nextEvent = ((events ?? []) as ListedEvent[]).find((e) => e.status === "published") ?? null;

  // The soonest class this member holds a seat or a place in line for.
  type NextClass = {
    status: "booked" | "waitlisted";
    class_sessions: { id: string; title: string; kind: ClassKind; starts_at: string };
  };
  const nextClass = ((myClasses ?? []) as unknown as NextClass[])
    .map((r) => ({ ...r, class_sessions: Array.isArray(r.class_sessions) ? r.class_sessions[0] : r.class_sessions }))
    .filter((r) => r.class_sessions)
    .sort((a, b) => Date.parse(a.class_sessions.starts_at) - Date.parse(b.class_sessions.starts_at))[0];

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
      {(news ?? []).length > 0 && (
        <section aria-label="اطلاعیه‌های باشگاه" className="mb-3.5 grid gap-2.5">
          {(news as { id: string; title: string; body: string | null; tone: "info" | "offer" | "alert" }[]).map((n) => (
            <AnnouncementCard key={n.id} title={n.title} body={n.body} tone={n.tone} />
          ))}
        </section>
      )}

      {frozen && (
        <p className="mb-3.5 flex items-center gap-3 rounded-[var(--radius-fc)] border border-fc-warn/40 bg-fc-warn/10 p-3.5">
          <Snowflake className="size-[18px] shrink-0 text-fc-warn" />
          <span className="min-w-0 flex-1">
            <b className="block text-[13px] text-fc-warn">اشتراکتان موقتاً متوقف است</b>
            <small className="text-[11.5px] text-fc-muted">
              روزهای توقف بعد از ادامه به تاریخ پایان اضافه می‌شود. برای ادامه به پذیرش بگویید.
            </small>
          </span>
        </p>
      )}

      {membership && !frozen && (days <= 7 || (left !== null && left <= 2)) && (
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

      {nextEvent && (
        <>
          <h2 className="mt-6 mb-3 text-[14.5px]">{nextEvent.is_competition ? "مسابقه‌ی پیش‌رو" : "رویداد پیش‌رو"}</h2>
          <Link
            href="/app/events"
            className="fc-card flex items-center gap-3 p-3.5 transition-colors hover:border-[var(--fc-line2)]"
          >
            <EventIcon kind={nextEvent.kind} size={52} />
            <span className="min-w-0 flex-1">
              <b className="block text-[13.5px]">{nextEvent.title}</b>
              <small className="text-[11.5px] text-fc-muted">
                {(() => {
                  const p = faDayParts(nextEvent.starts_at);
                  return `${p.weekday} ${p.day} ${p.month}، ساعت ${faDigits(tehranClock(nextEvent.starts_at))}`;
                })()}
              </small>
            </span>
            {nextEvent.my_status === "registered" ? (
              <span className="fc-chip fc-chip-ok">ثبت‌نام کردید</span>
            ) : (
              <span className="fc-chip fc-chip-warn"><Trophy className="size-3.5" />ثبت‌نام</span>
            )}
          </Link>
        </>
      )}
      {!nextEvent && gym?.events_enabled && (
        <>
          <h2 className="mt-6 mb-3 text-[14.5px]">مسابقه و رویداد</h2>
          <Link
            href="/app/events"
            className="fc-card flex items-center gap-3 p-3.5 transition-colors hover:border-[var(--fc-line2)]"
          >
            <span className="grid size-13 shrink-0 place-items-center rounded-xl border border-[var(--fc-line2)] bg-fc-navy2/60 text-fc-warn">
              <Trophy className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <b className="block text-[13.5px]">نتایج و رویدادهای باشگاه</b>
              <small className="text-[11px] text-fc-dim">مسابقه‌ی بعدی که اعلام شود، اینجا می‌آید</small>
            </span>
            <ChevronLeft className="size-[18px] text-fc-dim" />
          </Link>
        </>
      )}

      {gym?.classes_enabled && <h2 className="mt-6 mb-3 text-[14.5px]">کلاس بعدی</h2>}
      {!gym?.classes_enabled ? null : nextClass ? (
        <Link
          href="/app/classes"
          className="fc-card flex items-center gap-3 p-3.5 transition-colors hover:border-[var(--fc-line2)]"
        >
          <KindIcon kind={nextClass.class_sessions.kind} size={52} />
          <span className="min-w-0 flex-1">
            <b className="block text-[13.5px]">{nextClass.class_sessions.title}</b>
            <small className="fc-num text-[11.5px] text-fc-muted">
              {(() => {
                const p = faDayParts(nextClass.class_sessions.starts_at);
                return `${p.weekday} ${p.day} ${p.month} · ساعت ${faDigits(tehranClock(nextClass.class_sessions.starts_at))}`;
              })()}
            </small>
          </span>
          <span className={`fc-chip ${nextClass.status === "booked" ? "fc-chip-ok" : "fc-chip-warn"}`}>
            {nextClass.status === "booked" ? "رزرو شد" : "در صف"}
          </span>
        </Link>
      ) : (
        <Link
          href="/app/classes"
          className="fc-card flex items-center gap-3 p-3.5 transition-colors hover:border-[var(--fc-line2)]"
        >
          <span className="grid size-13 shrink-0 place-items-center rounded-xl border border-[var(--fc-line2)] bg-fc-navy2/60 text-fc-cyan">
            <CalendarDays className="size-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-[13.5px]">کلاس‌های گروهی</b>
            <small className="text-[11px] text-fc-dim">برنامه‌ی هفته را ببینید و جایتان را رزرو کنید</small>
          </span>
          <ChevronLeft className="size-[18px] text-fc-dim" />
        </Link>
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
