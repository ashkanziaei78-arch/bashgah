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
    /** File in program-covers, or null for the gradient fallback. */
    coverPath: string | null;
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
      cover_path: input.coverPath,
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

// ---------------------------------------------------------------
// Memberships
// ---------------------------------------------------------------

/** Sells or renews a subscription.
 *
 *  `sessions_total` and the expiry are snapshotted from the plan at the
 *  moment of sale rather than read through the join later: the gym
 *  raises prices and changes session counts, and a member who bought 16
 *  sessions must keep 16 when the plan becomes 12.
 *
 *  Any currently active membership is expired first. Two active rows for
 *  one member would make `sessions_left` ambiguous, and the door would
 *  deduct from whichever the query happened to order first.
 */
export async function startMembership(
  studentId: string,
  planId: string,
  startedOn: string,
  /** What was actually agreed, after any haggling. Left out, the plan's
   *  list price is snapshotted — the same reasoning as sessions_total,
   *  and the reason a discount now leaves a trace instead of vanishing. */
  priceToman?: number
): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startedOn)) {
    return { ok: false, message: "تاریخ شروع معتبر نیست." };
  }

  const { data: plan } = await supabase
    .from("plans")
    .select("duration_days, sessions_total, price_toman")
    .eq("id", planId)
    .maybeSingle();

  if (!plan) return { ok: false, message: "این پلن پیدا نشد." };

  const agreed =
    priceToman === undefined || !Number.isFinite(priceToman)
      ? plan.price_toman
      : Math.max(0, Math.round(priceToman));

  const expires = new Date(`${startedOn}T12:00:00Z`);
  expires.setUTCDate(expires.getUTCDate() + plan.duration_days);

  await supabase
    .from("memberships")
    .update({ status: "expired" })
    .eq("student_id", studentId)
    .eq("status", "active");

  const { error } = await supabase.from("memberships").insert({
    student_id: studentId,
    plan_id: planId,
    started_on: startedOn,
    expires_on: expires.toISOString().slice(0, 10),
    sessions_total: plan.sessions_total,
    sessions_used: 0,
    price_toman: agreed,
    status: "active",
  });

  if (error) return { ok: false, message: "ثبت اشتراک انجام نشد." };

  revalidatePath(`/coach/${studentId}`);
  revalidatePath("/coach");
  revalidatePath("/admin");
  revalidatePath("/app", "layout");
  return { ok: true };
}

/** Corrects the session count when the door got it wrong — a double tap,
 *  a member who was let in by hand, a disputed deduction. Staff have to
 *  be able to fix this without an admin opening the database. */
export async function adjustSessions(
  membershipId: string,
  studentId: string,
  delta: number
): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("memberships")
    .select("sessions_used, sessions_total")
    .eq("id", membershipId)
    .maybeSingle();

  if (!row) return { ok: false, message: "اشتراک پیدا نشد." };
  if (row.sessions_total === null) {
    return { ok: false, message: "این پلن نامحدود است و جلسه‌ای نمی‌شمارد." };
  }

  const used = Math.min(row.sessions_total, Math.max(0, row.sessions_used + delta));
  const { error } = await supabase
    .from("memberships")
    .update({ sessions_used: used })
    .eq("id", membershipId);

  if (error) return { ok: false, message: "اصلاح جلسات انجام نشد." };

  revalidatePath(`/coach/${studentId}`);
  revalidatePath("/app", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------
// Money
// ---------------------------------------------------------------

export type PaymentMethod = "cash" | "card" | "transfer" | "other";

/** Records money that actually came in.
 *
 *  Kept separate from the subscription's agreed price because the two
 *  genuinely differ: somebody pays half now and half next month, or
 *  pays for a locker that belongs to no subscription at all. Refusing
 *  to record the second kind is how a cash drawer stops balancing, so
 *  `membershipId` is optional.
 *
 *  A refund is a negative amount, which keeps the end-of-day figure a
 *  plain sum that cannot disagree with the drawer.
 */
export async function recordPayment(
  studentId: string,
  input: {
    membershipId: string | null;
    amountToman: number;
    method: PaymentMethod;
    note: string;
    /** Money taken yesterday and written up today. */
    paidOn?: string;
  }
): Promise<ActionResult> {
  const staff = await requireStaff();
  const supabase = await createClient();

  const amount = Math.round(Number(input.amountToman));
  if (!Number.isFinite(amount) || amount === 0) {
    return { ok: false, message: "مبلغ را بنویسید." };
  }
  if (Math.abs(amount) > 5_000_000_000) {
    return { ok: false, message: "مبلغ غیرعادی است. دوباره بررسی کنید." };
  }

  const paidAt =
    input.paidOn && /^\d{4}-\d{2}-\d{2}$/.test(input.paidOn)
      ? new Date(`${input.paidOn}T12:00:00Z`).toISOString()
      : new Date().toISOString();

  const { error } = await supabase.from("payments").insert({
    student_id: studentId,
    membership_id: input.membershipId,
    amount_toman: amount,
    method: input.method,
    note: input.note.trim() || null,
    recorded_by: staff.id,
    paid_at: paidAt,
  });

  if (error) return { ok: false, message: "ثبت پرداخت انجام نشد." };

  revalidatePath(`/coach/${studentId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/money");
  return { ok: true };
}

/** Takes back a payment entered by mistake.
 *
 *  A real refund is recorded as a negative payment so the history shows
 *  what happened; this is for the row that should never have existed —
 *  a slipped digit, the wrong member. */
export async function deletePayment(
  paymentId: string,
  studentId: string
): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("payments").delete().eq("id", paymentId);
  if (error) return { ok: false, message: "حذف پرداخت انجام نشد." };

  revalidatePath(`/coach/${studentId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/money");
  return { ok: true };
}

/** Corrects the agreed price of a subscription already sold — a
 *  discount settled after the fact, or a figure typed wrong. The
 *  payments against it are untouched; only what is owed changes. */
export async function setMembershipPrice(
  membershipId: string,
  studentId: string,
  priceToman: number
): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();

  const price = Math.round(Number(priceToman));
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, message: "مبلغ معتبر نیست." };
  }

  const { error } = await supabase
    .from("memberships")
    .update({ price_toman: price })
    .eq("id", membershipId);

  if (error) return { ok: false, message: "تغییر مبلغ انجام نشد." };

  revalidatePath(`/coach/${studentId}`);
  revalidatePath("/admin/money");
  return { ok: true };
}

// ---------------------------------------------------------------
// Body composition
// ---------------------------------------------------------------

export interface BodyAnalysisInput {
  measuredOn: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  bodyWaterPct: number | null;
  boneMassKg: number | null;
  visceralFat: number | null;
  metabolicAge: number | null;
  bmrKcal: number | null;
  neckCm: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  note: string;
}

/** Enters what the gym's body composition machine printed out.
 *
 *  Written as `source = 'analyzer'`, which row level security only
 *  lets staff do — a member can log their own weight but cannot
 *  publish a reading as the instrument's, or the one measurement in
 *  the table worth trusting would stop being trustworthy.
 *
 *  Upserted on the day, so re-keying a mistyped figure corrects that
 *  test rather than adding a second one beside it.
 */
export async function saveBodyAnalysis(
  studentId: string,
  input: BodyAnalysisInput
): Promise<ActionResult> {
  const staff = await requireStaff();
  const supabase = await createClient();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.measuredOn)) {
    return { ok: false, message: "تاریخ تست معتبر نیست." };
  }

  const row = {
    student_id: studentId,
    measured_on: input.measuredOn,
    source: "analyzer" as const,
    recorded_by: staff.id,
    weight_kg: input.weightKg,
    body_fat_pct: input.bodyFatPct,
    muscle_mass_kg: input.muscleMassKg,
    body_water_pct: input.bodyWaterPct,
    bone_mass_kg: input.boneMassKg,
    visceral_fat: input.visceralFat,
    metabolic_age: input.metabolicAge,
    bmr_kcal: input.bmrKcal,
    neck_cm: input.neckCm,
    chest_cm: input.chestCm,
    waist_cm: input.waistCm,
    hip_cm: input.hipCm,
    arm_cm: input.armCm,
    thigh_cm: input.thighCm,
    note: input.note.trim() || null,
  };

  // The table refuses a row where every measurement is null, but the
  // coach deserves a sentence rather than a constraint violation.
  const measured = Object.entries(row).some(
    ([key, value]) =>
      value !== null &&
      !["student_id", "measured_on", "source", "recorded_by", "note"].includes(key)
  );
  if (!measured) {
    return { ok: false, message: "حداقل یک عدد از برگه‌ی آنالیز را وارد کنید." };
  }

  const { error } = await supabase
    .from("body_metrics")
    .upsert(row, { onConflict: "student_id,measured_on,source" });

  if (error) {
    // Every numeric column carries a sanity range; a slipped decimal
    // point is the overwhelmingly likely cause.
    return {
      ok: false,
      message: "ثبت نشد. یکی از عددها خارج از محدوده‌ی معقول است — ممیز را بررسی کنید.",
    };
  }

  revalidatePath(`/coach/${studentId}`);
  revalidatePath("/app/progress");
  revalidatePath("/app/nutrition");
  return { ok: true };
}

const FREEZE_ERRORS: Record<string, string> = {
  staff_only: "فقط کارکنان می‌توانند اشتراک را متوقف کنند.",
  membership_not_found: "این اشتراک پیدا نشد.",
  already_frozen: "این اشتراک همین حالا متوقف است.",
  not_active: "فقط اشتراک فعال و تمام‌نشده را می‌شود متوقف کرد.",
  not_frozen: "این اشتراک متوقف نیست.",
};

function freezeError(raw: string): string {
  for (const [k, v] of Object.entries(FREEZE_ERRORS)) if (raw.includes(k)) return v;
  return "انجام نشد.";
}

/** Pauses a subscription and starts counting the days it is paused. */
export async function freezeMembership(
  membershipId: string,
  studentId: string,
  reason: string
): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.rpc("freeze_membership", {
    p_membership: membershipId,
    p_reason: reason.trim().slice(0, 200) || null,
  });
  if (error) return { ok: false, message: freezeError(error.message) };
  revalidatePath(`/coach/${studentId}`);
  revalidatePath("/coach");
  revalidatePath("/app", "layout");
  return { ok: true };
}

/** Resumes it, and adds the paused days to the end date — up to the
 *  gym's ceiling, which the database enforces. */
export async function thawMembership(membershipId: string, studentId: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.rpc("thaw_membership", { p_membership: membershipId });
  if (error) return { ok: false, message: freezeError(error.message) };
  revalidatePath(`/coach/${studentId}`);
  revalidatePath("/coach");
  revalidatePath("/app", "layout");
  return { ok: true };
}
