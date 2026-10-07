"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, getGym } from "@/lib/data";
import { classErrorMessage, KINDS_FOR, TEHRAN_OFFSET, type ClassKind, type BookingStatus } from "@/lib/classes";

export interface StaffClassResult {
  ok: boolean;
  message?: string;
  status?: BookingStatus;
  created?: number;
}

function refresh(sessionId?: string) {
  revalidatePath("/coach/classes");
  if (sessionId) revalidatePath(`/coach/classes/${sessionId}`);
  revalidatePath("/app/classes");
}

export interface NewClassInput {
  title: string;
  kind: ClassKind;
  /** Tehran calendar day, YYYY-MM-DD */
  day: string;
  /** HH:MM, Tehran */
  time: string;
  durationMin: number;
  capacity: number;
  coachId: string | null;
  location: string;
  description: string;
  /** 1 = just this one; up to 12 = the same slot every week */
  repeatWeeks: number;
}

/** Puts a class on the timetable, or a run of them. A weekly class is
 *  created as individual sessions that share a series id: next week's
 *  Tuesday can then be cancelled for a holiday without touching the
 *  rest, and the whole run can still be changed together. */
export async function createClasses(input: NewClassInput): Promise<StaffClassResult> {
  const staff = await requireStaff();
  const title = input.title.trim();
  if (title.length < 2 || title.length > 60) return { ok: false, message: "نام کلاس بین ۲ تا ۶۰ حرف باشد." };
  const gym = await getGym();
  if (!gym?.classes_enabled) return { ok: false, message: "کلاس‌ها برای این باشگاه فعال نیست." };
  if (!KINDS_FOR[gym.kind].includes(input.kind)) return { ok: false, message: "این نوع کلاس برای این باشگاه نیست." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.day) || !/^\d{2}:\d{2}$/.test(input.time)) {
    return { ok: false, message: "روز و ساعت را انتخاب کنید." };
  }
  const capacity = Math.round(Number(input.capacity));
  const duration = Math.round(Number(input.durationMin));
  const weeks = Math.round(Number(input.repeatWeeks));
  if (!(capacity >= 1 && capacity <= 200)) return { ok: false, message: "ظرفیت بین ۱ تا ۲۰۰ نفر باشد." };
  if (!(duration >= 15 && duration <= 240)) return { ok: false, message: "مدت کلاس بین ۱۵ تا ۲۴۰ دقیقه باشد." };
  if (!(weeks >= 1 && weeks <= 12)) return { ok: false, message: "تکرار بین ۱ تا ۱۲ هفته باشد." };

  const first = Date.parse(`${input.day}T${input.time}:00${TEHRAN_OFFSET}`);
  if (!Number.isFinite(first)) return { ok: false, message: "تاریخ معتبر نیست." };
  if (first < Date.now()) return { ok: false, message: "زمان کلاس گذشته است." };

  const seriesId = weeks > 1 ? crypto.randomUUID() : null;
  const rows = Array.from({ length: weeks }, (_, i) => ({
    series_id: seriesId,
    title,
    kind: input.kind,
    description: input.description.trim() || null,
    location: input.location.trim() || null,
    coach_id: input.coachId || null,
    starts_at: new Date(first + i * 7 * 86_400_000).toISOString(),
    duration_min: duration,
    capacity,
    created_by: staff.id,
  }));

  const supabase = await createClient();
  const { error } = await supabase.from("class_sessions").insert(rows);
  if (error) return { ok: false, message: "کلاس ثبت نشد." };

  refresh();
  return { ok: true, created: rows.length };
}

/** The ids a change applies to: this session, or this one and every
 *  later one in its weekly run that has not been cancelled. */
async function scopeIds(sessionId: string, scope: "one" | "series"): Promise<string[]> {
  if (scope === "one") return [sessionId];
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("class_sessions")
    .select("series_id, starts_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (!s?.series_id) return [sessionId];
  const { data } = await supabase
    .from("class_sessions")
    .select("id")
    .eq("series_id", s.series_id)
    .gte("starts_at", s.starts_at)
    .is("cancelled_at", null);
  return (data ?? []).map((r: { id: string }) => r.id);
}

/** A bigger room seats the waitlist on its own — a trigger in the
 *  database promotes people the moment capacity rises. */
export async function setCapacity(
  sessionId: string,
  capacity: number,
  scope: "one" | "series" = "one"
): Promise<StaffClassResult> {
  await requireStaff();
  const cap = Math.round(Number(capacity));
  if (!(cap >= 1 && cap <= 200)) return { ok: false, message: "ظرفیت بین ۱ تا ۲۰۰ نفر باشد." };
  const ids = await scopeIds(sessionId, scope);
  const supabase = await createClient();
  const { error } = await supabase.from("class_sessions").update({ capacity: cap }).in("id", ids);
  if (error) return { ok: false, message: "ظرفیت تغییر نکرد." };
  refresh(sessionId);
  return { ok: true };
}

export async function cancelClasses(
  sessionId: string,
  scope: "one" | "series" = "one"
): Promise<StaffClassResult> {
  await requireStaff();
  const ids = await scopeIds(sessionId, scope);
  const supabase = await createClient();
  for (const id of ids) {
    const { error } = await supabase.rpc("cancel_class", { p_session: id });
    if (error) return { ok: false, message: classErrorMessage(error.message) };
  }
  refresh(sessionId);
  return { ok: true, created: ids.length };
}

export async function staffAddToClass(
  sessionId: string,
  studentId: string,
  force: boolean
): Promise<StaffClassResult> {
  await requireStaff();
  if (!studentId) return { ok: false, message: "عضو را انتخاب کنید." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("staff_book_class", {
    p_session: sessionId,
    p_student: studentId,
    p_force: force,
  });
  if (error) return { ok: false, message: classErrorMessage(error.message) };
  refresh(sessionId);
  return { ok: true, status: data as BookingStatus };
}

export async function staffRemoveFromClass(sessionId: string, studentId: string): Promise<StaffClassResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.rpc("staff_cancel_booking", { p_session: sessionId, p_student: studentId });
  if (error) return { ok: false, message: classErrorMessage(error.message) };
  refresh(sessionId);
  return { ok: true };
}

export async function setAttendance(
  sessionId: string,
  bookingId: string,
  status: "attended" | "no_show" | "booked"
): Promise<StaffClassResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_attendance", { p_booking: bookingId, p_status: status });
  if (error) return { ok: false, message: classErrorMessage(error.message) };
  refresh(sessionId);
  return { ok: true };
}
