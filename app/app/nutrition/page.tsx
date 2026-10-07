import Link from "next/link";
import { Calculator, ChevronLeft, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { SessionRing } from "@/components/session-ring";
import { RequestButton } from "@/components/request-button";
import { faDigits, faNumber, faDate } from "@/lib/format";
import { calcMacros, ageFrom, GOAL_LABEL } from "@/lib/nutrition";
import { PhotoHeader } from "@/components/photo-header";
import { programCoverUrl } from "@/lib/storage";
import { estimateWorkout, type Level } from "@/lib/workout-estimate";
import { tehranDay } from "@/lib/classes";
import { classEntry, eventEntry, summariseBurn, type BurnEntry } from "@/lib/gym-burn";
import { GymBurnCard } from "@/components/nutrition/gym-burn-card";

type Supabase = Awaited<ReturnType<typeof createClient>>;

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

/** The last week of activity the gym itself recorded for this member —
 *  see lib/gym-burn.ts for why nothing else counts. */
async function loadGymBurn(supabase: Supabase, studentId: string, kg: number) {
  const now = new Date();
  const today = tehranDay(now);
  const fromDay = new Date(Date.parse(`${today}T00:00:00Z`) - 6 * 86_400_000).toISOString().slice(0, 10);
  const fromAt = `${fromDay}T00:00:00+03:30`;

  const [logs, classes, events] = await Promise.all([
    supabase
      .from("workout_logs")
      .select("performed_on, program_items(sets, rest_seconds, exercises(duration_seconds, level))")
      .eq("student_id", studentId)
      .eq("completed", true)
      .gte("performed_on", fromDay),
    supabase
      .from("class_bookings")
      .select("class_sessions!inner(kind, title, starts_at, duration_min)")
      .eq("student_id", studentId)
      .eq("status", "attended")
      .gte("class_sessions.starts_at", fromAt),
    supabase
      .from("event_registrations")
      .select("events!inner(kind, title, starts_at, ends_at)")
      .eq("student_id", studentId)
      .eq("status", "attended")
      .gte("events.starts_at", fromAt),
  ]);

  type Ex = { duration_seconds: number | null; level: Level | null };
  type Item = { sets: number; rest_seconds: number; exercises: Ex | Ex[] | null };
  const perDay = new Map<string, Parameters<typeof estimateWorkout>[0]>();
  for (const row of (logs.data ?? []) as { performed_on: string; program_items: Item | Item[] | null }[]) {
    const it = one(row.program_items);
    if (!it) continue;
    const ex = one(it.exercises);
    const list = perDay.get(row.performed_on) ?? [];
    list.push({
      sets: it.sets,
      restSeconds: it.rest_seconds,
      durationSeconds: ex?.duration_seconds ?? null,
      level: ex?.level ?? null,
    });
    perDay.set(row.performed_on, list);
  }

  const entries: BurnEntry[] = [];
  for (const [day, items] of perDay) {
    const est = estimateWorkout(items, kg);
    entries.push({ day, source: "workout", label: "تمرین", minutes: est.minutes, kcal: est.kcal ?? 0 });
  }
  type Cls = { kind: string; title: string; starts_at: string; duration_min: number };
  for (const row of (classes.data ?? []) as { class_sessions: Cls | Cls[] | null }[]) {
    const c = one(row.class_sessions);
    if (c) entries.push(classEntry(c, tehranDay(c.starts_at), kg));
  }
  type Ev = { kind: string; title: string; starts_at: string; ends_at: string | null };
  for (const row of (events.data ?? []) as { events: Ev | Ev[] | null }[]) {
    const e = one(row.events);
    if (e) entries.push(eventEntry(e, tehranDay(e.starts_at), kg));
  }

  return summariseBurn(entries, today);
}

export const metadata = { title: "تغذیه" };

export default async function Nutrition() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: plan } = await supabase
    .from("diet_plans")
    .select(
      `id, target_kcal, protein_g, carb_g, fat_g, ai_generated, created_at, coach_id, cover_path,
       diet_meals(id, position, name, time_of_day, items, kcal)`
    )
    .eq("student_id", profile.id)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // No plan yet, but we know their body — show what the calculator says
  // so the page has an answer instead of an empty state.
  const canEstimate =
    !plan && profile.sex && profile.birth_date && profile.height_cm && profile.weight_kg;

  const estimate = canEstimate
    ? calcMacros({
        sex: profile.sex!,
        age: ageFrom(profile.birth_date!),
        heightCm: Number(profile.height_cm),
        weightKg: Number(profile.weight_kg),
        activityLevel: (profile.activity_level ?? 3) as 1 | 2 | 3 | 4 | 5,
        goal: profile.goal ?? "maintain",
      })
    : null;

  const target = plan
    ? { kcal: plan.target_kcal, proteinG: plan.protein_g, carbG: plan.carb_g, fatG: plan.fat_g }
    : estimate;

  const meals = (plan?.diet_meals ?? []).slice().sort(
    (a: { position: number }, b: { position: number }) => a.position - b.position
  );
  const eaten = meals.reduce((sum: number, m: { kcal: number | null }) => sum + (m.kcal ?? 0), 0);
  const { data: coach } = plan?.coach_id
    ? await supabase
        .from("coach_directory")
        .select("full_name")
        .eq("id", plan.coach_id)
        .maybeSingle()
    : { data: null };
  const coachName = coach?.full_name as string | undefined;

  const kg = profile.weight_kg === null ? 0 : Number(profile.weight_kg);
  const burn = kg > 0 ? await loadGymBurn(supabase, profile.id, kg) : summariseBurn([], tehranDay(new Date()));

  return (
    <>
      <div className="pt-5 pb-3.5">
        <PhotoHeader
          title="برنامه غذایی"
          meta={
            plan
              ? `${coachName ? `بازبینی ${coachName}` : "برنامه‌ی شما"} · ${faDate(plan.created_at)}`
              : "هنوز برنامه‌ای ثبت نشده"
          }
          coverUrl={programCoverUrl(plan?.cover_path)}
          priority
        />
        {plan?.ai_generated && (
          <span className="fc-chip fc-chip-cy mt-3">
            <Sparkles className="size-3.5" />
            محاسبه‌ی هوشمند
          </span>
        )}
      </div>

      {target ? (
        <>
          <section className="fc-raised flex items-center gap-4.5 p-5">
            <SessionRing
              left={plan ? eaten : target.kcal}
              total={target.kcal}
              label="کالری"
              color="#2ed3a7"
            />
            <dl className="grid min-w-0 flex-1 gap-2.5">
              <div className="flex items-baseline justify-between text-[13px]">
                <dt className="text-fc-muted">هدف روزانه</dt>
                <dd className="fc-lat fc-num text-[14.5px] font-extrabold">
                  {faNumber(target.kcal)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between text-[13px]">
                <dt className="text-fc-muted">هدف بدنی</dt>
                <dd className="text-[13.5px] font-extrabold">
                  {GOAL_LABEL[profile.goal ?? "maintain"]}
                </dd>
              </div>
              {profile.weight_kg && (
                <div className="flex items-baseline justify-between text-[13px]">
                  <dt className="text-fc-muted">وزن فعلی</dt>
                  <dd className="fc-lat fc-num text-[14.5px] font-extrabold">
                    {faDigits(profile.weight_kg)} کیلو
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <div className="mt-3.5 grid grid-cols-3 gap-2.5">
            {[
              ["پروتئین", target.proteinG, "#00b2e3"],
              ["کربوهیدرات", target.carbG, "#f5b942"],
              ["چربی", target.fatG, "#2ed3a7"],
            ].map(([label, grams, color]) => (
              <div key={label as string} className="fc-card px-2 py-3 text-center">
                <b
                  className="fc-lat fc-num block text-base font-extrabold"
                  style={{ color: color as string }}
                >
                  {faDigits(grams as number)}
                </b>
                <small className="text-[10.5px] text-fc-dim">{label as string} (گرم)</small>
              </div>
            ))}
          </div>
        </>
      ) : null}

      <GymBurnCard summary={burn} hasWeight={kg > 0} />

      {/* The plan says what to eat; this says what the thing they just
          ate actually cost. Sitting directly under the daily target is
          the only place the two numbers can be read against each other. */}
      <Link
        href="/app/nutrition/estimate"
        className="fc-card mt-3.5 flex items-center gap-3 p-3.5 transition-colors hover:border-[var(--fc-line2)]"
      >
        <span className="grid size-13 shrink-0 place-items-center rounded-xl border border-[var(--fc-line2)] bg-fc-navy2/60 text-fc-cyan">
          <Calculator className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <b className="block text-[13.5px]">محاسبه‌گر هوشمند کالری</b>
          <small className="text-[11.5px] text-fc-dim">
            بنویسید چه خوردید تا کالری و درشت‌مغذی‌هایش را بگوید
          </small>
        </span>
        <ChevronLeft className="size-[18px] shrink-0 text-fc-dim" />
      </Link>

      {plan ? (
        <>
          <h2 className="mt-6 mb-3 text-[14.5px]">وعده‌های امروز</h2>
          <ul className="grid list-none gap-2.5 p-0">
            {meals.map(
              (m: {
                id: string;
                name: string;
                time_of_day: string | null;
                items: string;
                kcal: number | null;
              }) => (
                <li key={m.id} className="fc-card flex items-start gap-3 p-3.5">
                  <span className="fc-lat w-11 shrink-0 pt-0.5 text-[11px] font-extrabold tracking-[0.06em] text-fc-cyan">
                    {m.time_of_day ? faDigits(m.time_of_day.slice(0, 5)) : ""}
                  </span>
                  <div className="min-w-0 flex-1">
                    <b className="mb-1 block text-[13.5px]">{m.name}</b>
                    <p className="text-[12.5px] leading-relaxed text-fc-muted">{m.items}</p>
                  </div>
                  {m.kcal !== null && (
                    <span className="fc-lat fc-num shrink-0 text-xs font-extrabold text-fc-muted">
                      {faDigits(m.kcal)}
                    </span>
                  )}
                </li>
              )
            )}
          </ul>
          <div className="mt-4">
            <RequestButton kind="diet" label="درخواست تایم بازبینی رژیم" variant="ghost" />
          </div>
        </>
      ) : (
        <div className={estimate ? "fc-card mt-4 p-5" : "fc-raised mt-4 p-7 text-center"}>
          <h2 className="mb-2 text-base">
            {estimate ? "این عدد فقط یک برآورد است" : "هنوز برنامه‌ای ندارید"}
          </h2>
          <p className="mb-5 text-[13px] leading-relaxed text-fc-muted">
            {estimate
              ? "کالری بالا از روی قد، وزن، سن و سطح فعالیت شما حساب شده. وعده‌های واقعی را مربی در جلسه‌ی حضوری می‌نویسد."
              : "برای گرفتن برنامه غذایی، یک تایم حضوری با مربی بگذارید."}
          </p>
          <RequestButton kind="diet" label="درخواست برنامه غذایی" />
        </div>
      )}

      <div className="h-6" />
    </>
  );
}
