import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { type Profile } from "@/lib/data";
import { calcMacros, ageFrom } from "@/lib/nutrition";
import { DietBuilder, type DraftMeal } from "@/components/coach/diet-builder";

export const metadata = { title: "نوشتن برنامه غذایی" };

interface Params {
  params: Promise<{ studentId: string }>;
}

export default async function DietPage({ params }: Params) {
  const { studentId } = await params;
  const supabase = await createClient();

  const [{ data: studentRow }, { data: previous }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, birth_date, sex, height_cm, weight_kg, goal, activity_level"
      )
      .eq("id", studentId)
      .maybeSingle(),
    supabase
      .from("diet_plans")
      .select(
        `target_kcal, protein_g, carb_g, fat_g, created_at,
         diet_meals(position, name, time_of_day, items, kcal)`
      )
      .eq("student_id", studentId)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Named rather than inferred: `Database` is still the placeholder `any`,
  // so an untyped row would hand calcMacros whatever the column holds.
  const student = studentRow as Profile | null;
  if (!student) notFound();

  const complete =
    student.sex && student.birth_date && student.height_cm && student.weight_kg;

  // Computed here on the server so the coach opens the page with the
  // numbers already filled in — entering them by hand is the job this
  // module exists to remove.
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

  const meals: DraftMeal[] = (previous?.diet_meals ?? [])
    .slice()
    .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
    .map(
      (
        meal: {
          name: string;
          time_of_day: string | null;
          items: string;
          kcal: number | null;
        },
        index: number
      ) => ({
        key: `prev-${index}`,
        name: meal.name,
        time: meal.time_of_day?.slice(0, 5) ?? "",
        items: meal.items,
        kcal: meal.kcal,
      })
    );

  return (
    <>
      <header className="flex items-center gap-3 pt-5 pb-3.5">
        <Link
          href={`/coach/${studentId}`}
          aria-label="بازگشت به پرونده"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-fc-dim hover:text-fc-text"
        >
          <ChevronLeft className="size-5 rotate-180" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg">برنامه غذایی</h1>
          <p className="truncate text-xs text-fc-dim">برای {student.full_name}</p>
        </div>
      </header>

      <DietBuilder
        studentId={studentId}
        computed={target}
        initialMeals={meals}
        previousTarget={
          previous
            ? {
                kcal: previous.target_kcal,
                proteinG: previous.protein_g,
                carbG: previous.carb_g,
                fatG: previous.fat_g,
              }
            : null
        }
      />
    </>
  );
}
