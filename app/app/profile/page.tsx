import Link from "next/link";
import { KeyRound, ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, getGym } from "@/lib/data";
import { SignOutButton } from "@/components/sign-out-button";
import { Credit } from "@/components/credit";
import { ModeSwitch } from "@/components/mode-switch";
import { cookies } from "next/headers";
import { modeOf, MODE_COOKIE } from "@/lib/themes";
import { ProfileForm } from "@/components/profile/profile-form";
import { EnergyCard } from "@/components/profile/energy-card";
import { AnalysisPanel, type AnalyzerRow } from "@/components/profile/analysis-panel";
import { energyDay } from "@/lib/energy";
import { bmr, calcMacros, ageFrom } from "@/lib/nutrition";
import { loadGymBurn } from "@/lib/gym-burn-data";

export const metadata = { title: "پنل کاربری" };

export default async function ProfilePage() {
  const profile = await requireProfile();
  const [gym, supabase] = await Promise.all([getGym(), createClient()]);

  const [{ data: analyses }, { data: plan }] = await Promise.all([
    supabase
      .from("body_metrics")
      .select(
        "measured_on, weight_kg, body_fat_pct, fat_mass_kg, skeletal_muscle_kg, muscle_mass_kg, body_water_pct, protein_kg, minerals_kg, bmi, whr, visceral_fat, bmr_kcal, metabolic_age, inbody_score"
      )
      .eq("student_id", profile.id)
      .eq("source", "analyzer")
      .order("measured_on", { ascending: false })
      .limit(12),
    supabase
      .from("diet_plans")
      .select("target_kcal")
      .eq("student_id", profile.id)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const rows = (analyses ?? []) as AnalyzerRow[];

  // The most recent analyser test supplies the weight and resting rate
  // when it has them; the member's own profile fills the rest.
  const latest = rows[0];
  const weight = Number(latest?.weight_kg ?? profile.weight_kg ?? 0);
  const body =
    profile.sex && profile.birth_date && profile.height_cm && weight
      ? {
          sex: profile.sex,
          age: ageFrom(profile.birth_date),
          heightCm: Number(profile.height_cm),
          weightKg: weight,
          activityLevel: (profile.activity_level ?? 3) as 1 | 2 | 3 | 4 | 5,
          goal: profile.goal ?? "maintain",
        }
      : null;
  const target = plan?.target_kcal ?? (body ? calcMacros(body).kcal : null);
  const burn = weight > 0 ? await loadGymBurn(supabase, profile.id, weight) : null;
  const day =
    target !== null
      ? energyDay({
          target,
          analyzerBmr: rows.find((r) => r.bmr_kcal !== null)?.bmr_kcal ?? null,
          estimatedBmr: body ? bmr(body) : null,
          gymBurnToday: burn?.today ?? 0,
        })
      : null;

  const initials = profile.full_name.split(" ").map((w) => w[0]).slice(0, 2).join(" ");

  return (
    <>
      <header className="flex items-center gap-3 pt-5 pb-4">
        <span
          className="fc-lat grid size-12 shrink-0 place-items-center rounded-full text-[14px] font-extrabold text-white"
          style={{ background: "var(--fc-grad)" }}
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg">{profile.full_name}</h1>
          <p className="truncate text-xs text-fc-muted">
            <span dir="ltr" className="fc-lat normal-case">{profile.username}</span>
            {gym && <> · {gym.name}</>}
          </p>
        </div>
        <SignOutButton compact />
      </header>

      <div className="grid gap-3.5">
        {day ? (
          <EnergyCard day={day} goal={profile.goal ?? "maintain"} />
        ) : (
          <section className="fc-raised p-5">
            <h2 className="mb-1.5 text-[15px]">انرژی امروز</h2>
            <p className="text-[13px] text-fc-muted">
              برای دیدن کالری دریافتی و مصرفی، قد، وزن، تاریخ تولد و جنسیت را پایین همین صفحه وارد کنید.
            </p>
          </section>
        )}

        <AnalysisPanel rows={rows} />

        <ProfileForm
          initial={{
            fullName: profile.full_name,
            birthDate: profile.birth_date,
            sex: profile.sex,
            heightCm: profile.height_cm === null ? null : Number(profile.height_cm),
            weightKg: profile.weight_kg === null ? null : Number(profile.weight_kg),
            goal: profile.goal ?? "maintain",
            activityLevel: profile.activity_level ?? 3,
          }}
        />

        <ModeSwitch initial={modeOf((await cookies()).get(MODE_COOKIE)?.value)} />

        <Link href="/account" className="fc-card flex items-center gap-3 p-4">
          <KeyRound className="size-5 text-fc-cyan" />
          <span className="flex-1 text-[13.5px] font-bold">تغییر رمز عبور</span>
          <ChevronLeft className="size-[18px] text-fc-dim" />
        </Link>

        <SignOutButton />
        <Credit className="mt-2" />
      </div>
      <div className="h-6" />
    </>
  );
}
