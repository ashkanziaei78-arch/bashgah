"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import type { UserRole } from "@/lib/supabase/types";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

/** Admin-only guard.
 *
 *  Every action re-checks the role rather than trusting the page that
 *  rendered the form: a server action is a public endpoint, reachable by
 *  anyone who can read the client bundle. The database enforces this
 *  again through fc_is_admin() in RLS — this layer only turns a silent
 *  policy rejection into a readable message. */
async function requireAdmin() {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/coach");
  return profile;
}

function clamp(n: unknown, lo: number, hi: number, fallback: number): number {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
}

// ---------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------

/** The owner can switch the whole turnstile off; the tab disappears from
 *  every member's app rather than leading to a dead screen. */
export async function setCheckinEnabled(enabled: boolean): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("settings")
    .update({ value: enabled, updated_at: new Date().toISOString() })
    .eq("key", "checkin_module_enabled");

  if (error) return { ok: false, message: "تغییر تنظیمات ذخیره نشد." };

  revalidatePath("/admin");
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function setGymName(name: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, message: "نام باشگاه نمی‌تواند خالی باشد." };

  const { error } = await supabase
    .from("settings")
    .update({ value: trimmed, updated_at: new Date().toISOString() })
    .eq("key", "gym_name");

  if (error) return { ok: false, message: "نام باشگاه ذخیره نشد." };
  revalidatePath("/admin");
  return { ok: true };
}

// ---------------------------------------------------------------
// Roles
// ---------------------------------------------------------------

/** Promotes or demotes a member.
 *
 *  An admin cannot demote themselves: the check below is what stops a
 *  one-admin gym from locking itself out of its own settings with a
 *  mis-tap, which no amount of RLS would prevent. */
export async function setRole(userId: string, role: UserRole): Promise<ActionResult> {
  const admin = await requireAdmin();

  if (userId === admin.id) {
    return { ok: false, message: "نمی‌توانید نقش خودتان را عوض کنید." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);

  if (error) return { ok: false, message: "تغییر نقش ذخیره نشد." };

  revalidatePath("/admin/members");
  revalidatePath("/coach");
  return { ok: true };
}

// ---------------------------------------------------------------
// Plans
// ---------------------------------------------------------------

export interface PlanInput {
  name: string;
  kind: "basic" | "pro" | "vip";
  priceToman: number;
  durationDays: number;
  /** null means unlimited entry */
  sessionsTotal: number | null;
  perks: string[];
  isActive: boolean;
}

export async function savePlan(
  planId: string | null,
  input: PlanInput
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const name = input.name.trim();
  if (!name) return { ok: false, message: "نام پلن را بنویسید." };

  const row = {
    name,
    kind: input.kind,
    price_toman: clamp(input.priceToman, 0, 1_000_000_000, 0),
    duration_days: clamp(input.durationDays, 1, 3650, 30),
    sessions_total:
      input.sessionsTotal === null ? null : clamp(input.sessionsTotal, 1, 1000, 12),
    perks: input.perks.map((p) => p.trim()).filter(Boolean),
    is_active: input.isActive,
  };

  const { error } = planId
    ? await supabase.from("plans").update(row).eq("id", planId)
    : await supabase.from("plans").insert(row);

  if (error) return { ok: false, message: "ذخیره‌ی پلن انجام نشد." };

  revalidatePath("/admin/plans");
  revalidatePath("/");
  return { ok: true };
}

/** Plans are retired, never deleted: memberships reference them, and a
 *  deleted plan would orphan the history of everyone who ever bought it.
 *  Retiring hides it from the public catalogue and leaves the rest
 *  intact. */
export async function retirePlan(planId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("plans")
    .update({ is_active: false })
    .eq("id", planId);

  if (error) return { ok: false, message: "بایگانی پلن انجام نشد." };

  revalidatePath("/admin/plans");
  revalidatePath("/");
  return { ok: true };
}

// ---------------------------------------------------------------
// Exercise library
// ---------------------------------------------------------------

export interface ExerciseInput {
  name: string;
  muscleGroup: string;
  level: "beginner" | "intermediate" | "advanced";
  instructions: string;
  videoPath: string;
  durationSeconds: number | null;
}

export async function saveExercise(
  exerciseId: string | null,
  input: ExerciseInput
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const name = input.name.trim();
  const muscleGroup = input.muscleGroup.trim();
  if (!name) return { ok: false, message: "نام حرکت را بنویسید." };
  if (!muscleGroup) return { ok: false, message: "گروه عضلانی را بنویسید." };

  const row = {
    name,
    muscle_group: muscleGroup,
    level: input.level,
    instructions: input.instructions.trim() || null,
    video_path: input.videoPath.trim() || null,
    duration_seconds:
      input.durationSeconds === null ? null : clamp(input.durationSeconds, 1, 3600, 40),
  };

  const { error } = exerciseId
    ? await supabase.from("exercises").update(row).eq("id", exerciseId)
    : await supabase.from("exercises").insert({ ...row, created_by: admin.id });

  if (error) return { ok: false, message: "ذخیره‌ی حرکت انجام نشد." };

  revalidatePath("/admin/exercises");
  return { ok: true };
}

/** Refuses when a programme still references the movement, rather than
 *  letting the foreign key throw an unreadable error at the user. */
export async function deleteExercise(exerciseId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { count } = await supabase
    .from("program_items")
    .select("id", { count: "exact", head: true })
    .eq("exercise_id", exerciseId);

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      message: `این حرکت در ${count} برنامه استفاده شده و حذف نمی‌شود.`,
    };
  }

  const { error } = await supabase.from("exercises").delete().eq("id", exerciseId);
  if (error) return { ok: false, message: "حذف حرکت انجام نشد." };

  revalidatePath("/admin/exercises");
  return { ok: true };
}

// ---------------------------------------------------------------
// NFC cards
// ---------------------------------------------------------------

export async function issueCard(
  studentId: string,
  uid: string,
  label: string
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  // Readers report the serial in hex; normalising here means a tag
  // registered as "04a2b7c1d3" still matches a tap read as "04A2B7C1D3".
  const normalised = uid.trim().toUpperCase().replace(/[^0-9A-F]/g, "");
  if (normalised.length < 6) {
    return { ok: false, message: "شماره‌ی کارت معتبر نیست." };
  }

  const { error } = await supabase.from("cards").insert({
    student_id: studentId,
    uid: normalised,
    label: label.trim() || null,
    active: true,
  });

  if (error) {
    return {
      ok: false,
      message: error.code === "23505" ? "این کارت قبلاً ثبت شده." : "ثبت کارت انجام نشد.",
    };
  }

  revalidatePath("/admin/cards");
  return { ok: true };
}

/** Lost cards are deactivated, not deleted — the check-in history points
 *  at them, and a member asking "when did I last come in?" should still
 *  get an answer after they replace a tag. */
export async function setCardActive(
  cardId: string,
  active: boolean
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("cards").update({ active }).eq("id", cardId);
  if (error) return { ok: false, message: "تغییر وضعیت کارت انجام نشد." };

  revalidatePath("/admin/cards");
  return { ok: true };
}
