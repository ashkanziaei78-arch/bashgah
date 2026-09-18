import Link from "next/link";
import { notFound } from "next/navigation";
import { Apple, ChevronLeft, Dumbbell, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveMembership, sessionsLeft, type Profile } from "@/lib/data";
import { calcMacros, ageFrom, GOAL_LABEL, ACTIVITY_LABEL } from "@/lib/nutrition";
import { faDigits, faNumber, faDate, daysUntil } from "@/lib/format";

interface Params {
  params: Promise<{ studentId: string }>;
}

export async function generateMetadata({ params }: Params) {
  const { studentId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", studentId)
    .maybeSingle();

  return { title: data?.full_name ?? "شاگرد" };
}

export default async function MemberFile({ params }: Params) {
  const { studentId } = await params;
  const supabase = await createClient();

  // The generated types are still a placeholder (`Database = any`), so the
  // row is named here rather than inferred — otherwise `goal` is `any` and
  // cannot index the label records below.
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, full_name, role, birth_date, sex, height_cm, weight_kg, goal, activity_level"
    )
    .eq("id", studentId)
    .maybeSingle();

  const student = data as Profile | null;
  if (!student) notFound();

  const [membership, { data: program }, { data: diet }] = await Promise.all([
    getActiveMembership(studentId),
    supabase
      .from("programs")
      .select("id, title, status, published_at, program_items(count)")
      .eq("student_id", studentId)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("diet_plans")
      .select("id, target_kcal, ai_generated, created_at, diet_meals(count)")
      .eq("student_id", studentId)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // The whole point of the calculator: the coach reads the target rather
  // than working it out on paper between clients.
  const complete =
    student.sex && student.birth_date && student.height_cm && student.weight_kg;

  const target = complete
    ? calcMacros({
        sex: student.sex!,
        age: ageFrom(student.birth_date!),
        heightCm: Number(student.height_cm),
        weightKg: Number(student.weight_kg),
        activityLevel: (student.activity_level ?? 3) as 1 | 2 | 3 | 4 | 5,
        goal: student.goal ?? "maintain",
      })
    : null;

  const left = sessionsLeft(membership);

  return (
    <>
      <header className="flex items-center gap-3 pt-5 pb-3.5">
        <Link
          href="/coach"
          aria-label="بازگشت به صف"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-fc-dim hover:text-fc-text"
        >
          <ChevronLeft className="size-5 rotate-180" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg">{student.full_name}</h1>
          <p className="text-xs text-fc-dim">
            {membership
              ? `${membership.plans?.name} · ${faDigits(daysUntil(membership.expires_on))} روز مانده`
              : "بدون اشتراک فعال"}
          </p>
        </div>
        {left !== null && (
          <span className="fc-chip fc-chip-cy fc-num shrink-0">
            {faDigits(left)} جلسه
          </span>
        )}
      </header>

      <section className="fc-raised p-5">
        <h2 className="mb-3 text-[14.5px]">مشخصات بدنی</h2>
        {complete ? (
          <dl className="grid grid-cols-2 gap-x-5 gap-y-2.5">
            {[
              ["قد", `${faDigits(student.height_cm!)} سانتی‌متر`],
              ["وزن", `${faDigits(student.weight_kg!)} کیلوگرم`],
              ["سن", `${faDigits(ageFrom(student.birth_date!))} سال`],
              ["هدف", GOAL_LABEL[student.goal ?? "maintain"]],
              ["فعالیت", ACTIVITY_LABEL[student.activity_level ?? 3]],
              ["جنسیت", student.sex === "male" ? "مرد" : "زن"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between text-[13px]">
                <dt className="text-fc-muted">{label}</dt>
                <dd className="text-[13px] font-extrabold">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-[13px] leading-relaxed text-fc-muted">
            قد، وزن، تاریخ تولد یا جنسیت ثبت نشده. تا وقتی این‌ها کامل نشوند
            کالری خودکار محاسبه نمی‌شود و باید دستی بنویسید.
          </p>
        )}
      </section>

      {target && (
        <section className="fc-card mt-3.5 p-5">
          <h2 className="mb-1 flex items-center gap-2 text-[14.5px]">
            <Sparkles className="size-4 text-fc-cyan" />
            محاسبه‌ی کالری
          </h2>
          <p className="mb-4 text-[12.5px] leading-relaxed text-fc-muted">
            بر پایه‌ی Mifflin-St Jeor و سطح فعالیت. سوخت‌وساز پایه{" "}
            <b className="fc-num text-fc-text">{faNumber(target.bmr)}</b> و کل
            مصرف روزانه <b className="fc-num text-fc-text">{faNumber(target.tdee)}</b>{" "}
            کالری است.
          </p>

          <div className="grid grid-cols-4 gap-2.5">
            {[
              ["کالری هدف", target.kcal, "#00b2e3"],
              ["پروتئین", target.proteinG, "#e8f3fb"],
              ["کربوهیدرات", target.carbG, "#f5b942"],
              ["چربی", target.fatG, "#2ed3a7"],
            ].map(([label, value, color]) => (
              <div key={label as string} className="text-center">
                <b
                  className="fc-lat fc-num block text-[15px] font-extrabold"
                  style={{ color: color as string }}
                >
                  {faNumber(value as number)}
                </b>
                <small className="text-[10.5px] text-fc-dim">{label as string}</small>
              </div>
            ))}
          </div>
        </section>
      )}

      <h2 className="mt-6 mb-3 text-[14.5px]">برنامه‌ها</h2>
      <div className="grid gap-2.5">
        <Link
          href={`/coach/${studentId}/program`}
          className="fc-card flex items-center gap-3 p-3.5 transition-colors hover:border-[var(--fc-line2)]"
        >
          <span className="grid size-13 shrink-0 place-items-center rounded-xl border border-[var(--fc-line2)] bg-fc-navy2/60 text-fc-cyan">
            <Dumbbell className="size-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-[13.5px]">
              {program ? program.title : "هنوز برنامه‌ی تمرینی ندارد"}
            </b>
            <small className="text-[11.5px] text-fc-dim">
              {program
                ? `${faDigits(program.program_items?.[0]?.count ?? 0)} حرکت · ${faDate(program.published_at)}`
                : "برای نوشتن بزنید"}
            </small>
          </span>
          <ChevronLeft className="size-[18px] shrink-0 text-fc-dim" />
        </Link>

        <Link
          href={`/coach/${studentId}/diet`}
          className="fc-card flex items-center gap-3 p-3.5 transition-colors hover:border-[var(--fc-line2)]"
        >
          <span className="grid size-13 shrink-0 place-items-center rounded-xl border border-[var(--fc-line2)] bg-fc-navy2/60 text-fc-cyan">
            <Apple className="size-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <b className="fc-num block text-[13.5px]">
              {diet
                ? `${faNumber(diet.target_kcal)} کالری هدف`
                : "هنوز برنامه‌ی غذایی ندارد"}
            </b>
            <small className="text-[11.5px] text-fc-dim">
              {diet
                ? `${faDigits(diet.diet_meals?.[0]?.count ?? 0)} وعده · ${faDate(diet.created_at)}`
                : "برای نوشتن بزنید"}
            </small>
          </span>
          <ChevronLeft className="size-[18px] shrink-0 text-fc-dim" />
        </Link>
      </div>

      <div className="h-6" />
    </>
  );
}
