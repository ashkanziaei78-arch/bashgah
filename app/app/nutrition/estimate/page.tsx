import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { calcMacros, ageFrom } from "@/lib/nutrition";
import { CalorieEstimator } from "@/components/calorie-estimator";

export const metadata = { title: "محاسبه‌ی کالری" };

export default async function EstimatePage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  // The member's own target, so the answer reads as "a third of today"
  // rather than a bare number. The coach's published plan wins over the
  // formula, because it is the one they were actually given.
  const { data: plan } = await supabase
    .from("diet_plans")
    .select("target_kcal")
    .eq("student_id", profile.id)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const complete =
    profile.sex && profile.birth_date && profile.height_cm && profile.weight_kg;

  const target =
    plan?.target_kcal ??
    (complete
      ? calcMacros({
          sex: profile.sex!,
          age: ageFrom(profile.birth_date!),
          heightCm: Number(profile.height_cm),
          weightKg: Number(profile.weight_kg),
          activityLevel: (profile.activity_level ?? 3) as 1 | 2 | 3 | 4 | 5,
          goal: profile.goal ?? "maintain",
        }).kcal
      : null);

  return (
    <>
      <header className="flex items-center gap-3 pt-5 pb-3.5">
        <Link
          href="/app/nutrition"
          aria-label="بازگشت به تغذیه"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-fc-dim hover:text-fc-text"
        >
          <ChevronLeft className="size-5 rotate-180" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg">محاسبه‌ی کالری</h1>
          <p className="text-xs text-fc-dim">هر وعده را بنویسید، کالری‌اش را بگیرید</p>
        </div>
      </header>

      <CalorieEstimator dailyTarget={target} />

      <div className="h-6" />
    </>
  );
}
