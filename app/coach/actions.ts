"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/data";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

/** Programmes and diets are versioned rather than edited in place.
 *
 *  `workout_logs` points at `program_items`, so rewriting the items of a
 *  live programme would silently re-label what the member already
 *  lifted — last month's 57.5kg bench would become a row under whatever
 *  exercise took that slot. Publishing therefore writes a new revision
 *  and archives the previous one, which keeps the history readable and
 *  gives the coach a record of what they prescribed and when.
 */
async function archivePublished(
  table: "programs" | "diet_plans",
  studentId: string
) {
  const supabase = await createClient();
  await supabase
    .from(table)
    .update({ status: "archived" })
    .eq("student_id", studentId)
    .eq("status", "published");
}

function clamp(n: unknown, lo: number, hi: number, fallback: number): number {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
}

// ---------------------------------------------------------------
// Requests
// ---------------------------------------------------------------

/** Books the in-person slot and claims the request for this coach. */
export async function scheduleRequest(
  requestId: string,
  slotAt: string
): Promise<ActionResult> {
  const staff = await requireStaff();
  const supabase = await createClient();

  if (!slotAt || Number.isNaN(Date.parse(slotAt))) {
    return { ok: false, message: "زمان انتخاب‌شده معتبر نیست." };
  }

  const { error } = await supabase
    .from("requests")
    .update({ status: "scheduled", slot_at: slotAt, coach_id: staff.id })
    .eq("id", requestId);

  if (error) return { ok: false, message: "ثبت تایم انجام نشد." };

  revalidatePath("/coach");
  revalidatePath("/app");
  return { ok: true };
}

/** Closes a request — the session happened, or it is no longer wanted. */
export async function closeRequest(
  requestId: string,
  outcome: "done" | "cancelled"
): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();

  const { error } = await supabase
    .from("requests")
    .update({ status: outcome })
    .eq("id", requestId);

  if (error) return { ok: false, message: "بسته‌شدن درخواست انجام نشد." };

  revalidatePath("/coach");
  revalidatePath("/app");
  return { ok: true };
}

// ---------------------------------------------------------------
// Workout programme
// ---------------------------------------------------------------

export interface ProgramItemInput {
  exerciseId: string;
  sets: number;
  reps: number;
  rest: number;
  note: string;
}

export async function saveProgram(
  studentId: string,
  input: {
    title: string;
    notes: string;
    items: ProgramItemInput[];
    /** File name in the program-covers bucket, or null for the fallback. */
    coverPath: string | null;
    publish: boolean;
  }
): Promise<ActionResult> {
  const staff = await requireStaff();
  const supabase = await createClient();

  const title = input.title.trim();
  if (!title) return { ok: false, message: "عنوان برنامه را بنویسید." };
  if (input.items.length === 0) {
    return { ok: false, message: "حداقل یک حرکت به برنامه اضافه کنید." };
  }

  if (input.publish) await archivePublished("programs", studentId);

  const { data: program, error: programError } = await supabase
    .from("programs")
    .insert({
      student_id: studentId,
      coach_id: staff.id,
      title,
      notes: input.notes.trim() || null,
      cover_path: input.coverPath,
      status: input.publish ? "published" : "draft",
      published_at: input.publish ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (programError || !program) {
    return { ok: false, message: "ثبت برنامه انجام نشد." };
  }

  const { error: itemsError } = await supabase.from("program_items").insert(
    input.items.map((item, index) => ({
      program_id: program.id,
      exercise_id: item.exerciseId,
      position: index + 1,
      sets: clamp(item.sets, 1, 20, 3),
      reps: clamp(item.reps, 1, 100, 12),
      rest_seconds: clamp(item.rest, 0, 600, 90),
      note: item.note.trim() || null,
    }))
  );

  if (itemsError) {
    // The programme row without its items would show the member an empty
    // session, so take it back out rather than leaving a husk behind.
    await supabase.from("programs").delete().eq("id", program.id);
    return { ok: false, message: "ثبت حرکات انجام نشد." };
  }

  revalidatePath("/coach");
  revalidatePath(`/coach/${studentId}`);
  revalidatePath("/app");
  revalidatePath("/app/workout");
  return { ok: true };
}

// ---------------------------------------------------------------
// Diet plan
// ---------------------------------------------------------------

export interface MealInput {
  name: string;
  time: string;
  items: string;
  kcal: number | null;
}

export async function saveDiet(
  studentId: string,
  input: {
    kcal: number;
    proteinG: number;
    carbG: number;
    fatG: number;
    /** false once the coach has overridden any of the computed numbers */
    fromCalculator: boolean;
    meals: MealInput[];
    publish: boolean;
  }
): Promise<ActionResult> {
  const staff = await requireStaff();
  const supabase = await createClient();

  const meals = input.meals.filter((m) => m.name.trim() && m.items.trim());
  if (meals.length === 0) {
    return { ok: false, message: "حداقل یک وعده با نام و محتوا بنویسید." };
  }

  if (input.publish) await archivePublished("diet_plans", studentId);

  const { data: plan, error: planError } = await supabase
    .from("diet_plans")
    .insert({
      student_id: studentId,
      coach_id: staff.id,
      target_kcal: clamp(input.kcal, 800, 6000, 2000),
      protein_g: clamp(input.proteinG, 0, 500, 120),
      carb_g: clamp(input.carbG, 0, 1000, 200),
      fat_g: clamp(input.fatG, 0, 300, 60),
      ai_generated: input.fromCalculator,
      status: input.publish ? "published" : "draft",
    })
    .select("id")
    .single();

  if (planError || !plan) {
    return { ok: false, message: "ثبت برنامه غذایی انجام نشد." };
  }

  const { error: mealsError } = await supabase.from("diet_meals").insert(
    meals.map((meal, index) => ({
      diet_plan_id: plan.id,
      position: index + 1,
      name: meal.name.trim(),
      time_of_day: /^\d{2}:\d{2}$/.test(meal.time) ? meal.time : null,
      items: meal.items.trim(),
      kcal: meal.kcal === null ? null : clamp(meal.kcal, 0, 3000, 0),
    }))
  );

  if (mealsError) {
    await supabase.from("diet_plans").delete().eq("id", plan.id);
    return { ok: false, message: "ثبت وعده‌ها انجام نشد." };
  }

  revalidatePath("/coach");
  revalidatePath(`/coach/${studentId}`);
  revalidatePath("/app");
  revalidatePath("/app/nutrition");
  return { ok: true };
}
