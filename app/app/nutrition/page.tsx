import { Sparkles, Salad } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { SessionRing } from "@/components/session-ring";
import { SectionHeading, EmptyState, StatRow } from "@/components/ui";
import { RequestButton } from "@/components/request-button";
import { faDigits, faNumber, faDate } from "@/lib/format";
import { calcMacros, ageFrom, GOAL_LABEL } from "@/lib/nutrition";

export const metadata = { title: "تغذیه" };

export default async function Nutrition() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: plan } = await supabase
    .from("diet_plans")
    .select(
      `id, target_kcal, protein_g, carb_g, fat_g, ai_generated, created_at, coach_id,
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

  return (
    <>
      <header className="flex items-start gap-3 pt-6 pb-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl">برنامه غذایی</h1>
          <p className="text-xs text-fc-dim">
            {plan
              ? `${coachName ? `بازبینی ${coachName}` : "برنامه‌ی شما"} · ${faDate(plan.created_at)}`
              : "هنوز برنامه‌ای ثبت نشده"}
          </p>
        </div>
        {plan?.ai_generated && (
          <span className="fc-chip fc-chip-cy shrink-0">
            <Sparkles className="size-3.5" />
            محاسبه‌ی هوشمند
          </span>
        )}
      </header>

      {target ? (
        <>
          <section className="fc-hero fc-rise flex items-center gap-5 p-5">
            <SessionRing
              left={plan ? eaten : target.kcal}
              total={target.kcal}
              label="کالری"
              tone="ok"
            />
            <dl className="grid min-w-0 flex-1 gap-3">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <dt className="text-fc-muted">هدف روزانه</dt>
                <dd className="fc-num text-md">{faNumber(target.kcal)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <dt className="text-fc-muted">هدف بدنی</dt>
                <dd className="truncate font-extrabold">
                  {GOAL_LABEL[profile.goal ?? "maintain"]}
                </dd>
              </div>
              {profile.weight_kg && (
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <dt className="text-fc-muted">وزن فعلی</dt>
                  <dd className="fc-num text-md">
                    {faDigits(profile.weight_kg)} کیلو
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <StatRow
            stats={[
              { label: "پروتئین (گرم)", value: faDigits(target.proteinG), tone: "cyan" },
              { label: "کربوهیدرات (گرم)", value: faDigits(target.carbG), tone: "warn" },
              { label: "چربی (گرم)", value: faDigits(target.fatG), tone: "ok" },
            ]}
          />
        </>
      ) : null}

      {plan ? (
        <>
          <SectionHeading>وعده‌های امروز</SectionHeading>
          <ul className="fc-stagger grid list-none gap-2.5 p-0">
            {meals.map(
              (m: {
                id: string;
                name: string;
                time_of_day: string | null;
                items: string;
                kcal: number | null;
              }) => (
                <li key={m.id} className="fc-card flex items-start gap-3.5 p-4">
                  <span className="fc-num w-12 shrink-0 pt-0.5 text-sm text-fc-cyan">
                    {m.time_of_day ? faDigits(m.time_of_day.slice(0, 5)) : "—"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <b className="mb-1 block text-md">{m.name}</b>
                    <p className="text-sm leading-relaxed text-fc-muted">{m.items}</p>
                  </div>
                  {m.kcal !== null && (
                    <span className="shrink-0 text-end">
                      <b className="fc-num block text-md text-fc-text">{faDigits(m.kcal)}</b>
                      <small className="text-2xs text-fc-dim">کالری</small>
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
        <div className="mt-4">
          {estimate ? (
            // We know their body, so the page answers with the calculator's
            // number rather than an empty state — but says plainly that a
            // coach has not signed off on it.
            <div className="fc-card p-5">
              <h2 className="mb-2 text-md">این عدد فقط یک برآورد است</h2>
              <p className="mb-5 text-sm leading-relaxed text-fc-muted">
                کالری بالا از روی قد، وزن، سن و سطح فعالیت شما حساب شده.
                وعده‌های واقعی را مربی در جلسه‌ی حضوری می‌نویسد.
              </p>
              <RequestButton kind="diet" label="درخواست برنامه غذایی" />
            </div>
          ) : (
            <EmptyState
              icon={Salad}
              title="هنوز برنامه‌ای ندارید"
              body="برای گرفتن برنامه غذایی، یک تایم حضوری با مربی بگذارید."
            >
              <RequestButton kind="diet" label="درخواست برنامه غذایی" />
            </EmptyState>
          )}
        </div>
      )}

      <div className="h-8" />
    </>
  );
}
