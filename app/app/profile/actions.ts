"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";

export interface ProfileInput {
  fullName: string;
  birthDate: string | null;
  sex: "male" | "female" | null;
  heightCm: number | null;
  weightKg: number | null;
  goal: "gain" | "lose" | "maintain";
  activityLevel: number;
}

export interface ProfileResult {
  ok: boolean;
  message?: string;
}

/** A member's own details. Role, username and gym are not in this list
 *  and the profile guard trigger would refuse them anyway. */
export async function updateMyProfile(input: ProfileInput): Promise<ProfileResult> {
  const me = await requireProfile();

  const fullName = input.fullName.trim();
  if (fullName.length < 2 || fullName.length > 60) return { ok: false, message: "نام بین ۲ تا ۶۰ حرف باشد." };
  if (input.birthDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)) return { ok: false, message: "تاریخ تولد معتبر نیست." };
    const age = (Date.now() - Date.parse(input.birthDate)) / (365.25 * 86_400_000);
    if (!(age >= 10 && age <= 100)) return { ok: false, message: "تاریخ تولد معتبر نیست." };
  }
  if (input.sex !== null && input.sex !== "male" && input.sex !== "female") return { ok: false, message: "جنسیت معتبر نیست." };
  if (input.heightCm !== null && !(input.heightCm >= 120 && input.heightCm <= 230)) {
    return { ok: false, message: "قد بین ۱۲۰ تا ۲۳۰ سانتی‌متر باشد." };
  }
  if (input.weightKg !== null && !(input.weightKg >= 30 && input.weightKg <= 250)) {
    return { ok: false, message: "وزن بین ۳۰ تا ۲۵۰ کیلوگرم باشد." };
  }
  if (!["gain", "lose", "maintain"].includes(input.goal)) return { ok: false, message: "هدف معتبر نیست." };
  const activity = Math.round(input.activityLevel);
  if (!(activity >= 1 && activity <= 5)) return { ok: false, message: "سطح فعالیت معتبر نیست." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      birth_date: input.birthDate,
      sex: input.sex,
      height_cm: input.heightCm,
      weight_kg: input.weightKg,
      goal: input.goal,
      activity_level: activity,
    })
    .eq("id", me.id);

  if (error) return { ok: false, message: "ذخیره نشد. دوباره امتحان کنید." };
  revalidatePath("/app", "layout");
  return { ok: true };
}
