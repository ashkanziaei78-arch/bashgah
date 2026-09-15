import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { SessionRing } from "@/components/session-ring";
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
      <header className="flex items-start gap-3 pt-5 pb-3.5">
        <div className="flex-1">
          <h1 className="text-lg">برنامه غذایی</h1>
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
