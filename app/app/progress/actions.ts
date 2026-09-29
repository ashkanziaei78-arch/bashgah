"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { todayInTehran } from "@/lib/format";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

/** The member's own weigh-in.
 *
 *  `source` is pinned to 'self' here and again in the row level
 *  security policy, so this can only ever write the member's own scale
 *  reading. The gym's body composition machine is the one trustworthy
 *  number in the table and a typed-in figure must not be able to
 *  impersonate it.
 *
 *  Upserted on (student, day, source): weighing yourself twice before
 *  breakfast corrects the morning's figure instead of putting two dots
 *  on the chart.
 */
export async function logWeight(
  weightKg: number,
  measuredOn?: string
): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const weight = Math.round(Number(weightKg) * 10) / 10;
  if (!Number.isFinite(weight) || weight < 20 || weight > 400) {
    return { ok: false, message: "وزن باید بین ۲۰ تا ۴۰۰ کیلوگرم باشد." };
  }

  const day = measuredOn && /^\d{4}-\d{2}-\d{2}$/.test(measuredOn)
    ? measuredOn
    : todayInTehran();

  // Nobody weighs themselves next Tuesday.
  if (day > todayInTehran()) {
    return { ok: false, message: "تاریخ نمی‌تواند در آینده باشد." };
  }

  const { error } = await supabase.from("body_metrics").upsert(
    {
      student_id: profile.id,
      measured_on: day,
      source: "self",
      recorded_by: profile.id,
      weight_kg: weight,
    },
    { onConflict: "student_id,measured_on,source" }
  );

  if (error) return { ok: false, message: "ثبت وزن انجام نشد." };

  // The calorie target is derived from bodyweight, so the nutrition tab
  // is stale the moment this lands. The database trigger has already
  // moved profiles.weight_kg; this makes the pages that read it agree.
  revalidatePath("/app/progress");
  revalidatePath("/app/nutrition");
  revalidatePath("/app");
  return { ok: true };
}

/** Removes a reading the member entered themselves — a typo they only
 *  noticed later, or a day they would rather not keep. Staff readings
 *  are not theirs to delete; the policy refuses those. */
export async function deleteWeight(measuredOn: string): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("body_metrics")
    .delete()
    .eq("student_id", profile.id)
    .eq("measured_on", measuredOn)
    .eq("source", "self");

  if (error) return { ok: false, message: "حذف انجام نشد." };

  revalidatePath("/app/progress");
  revalidatePath("/app/nutrition");
  revalidatePath("/app");
  return { ok: true };
}
