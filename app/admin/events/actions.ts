"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, getGym } from "@/lib/data";
import {
  EVENT_KINDS, SCORE_KINDS, eventErrorMessage, parseScore,
  type EventKind, type EventStatus, type ScoreKind,
} from "@/lib/events";
import { TEHRAN_OFFSET } from "@/lib/classes";

export interface AdminEventResult {
  ok: boolean;
  message?: string;
  id?: string;
}

function refresh(id?: string) {
  revalidatePath("/admin/events");
  if (id) revalidatePath(`/admin/events/${id}`);
  revalidatePath("/app/events");
  revalidatePath("/app");
}

export interface NewEventInput {
  title: string;
  kind: EventKind;
  isCompetition: boolean;
  day: string;
  time: string;
  hours: number;
  location: string;
  capacity: number | null;
  feeToman: number | null;
  /** Hours before the start that sign-up closes; null = until the start. */
  closeHoursBefore: number | null;
  divisions: string[];
  scoreKind: ScoreKind;
  lowerIsBetter: boolean;
  description: string;
  publish: boolean;
}

export async function createEvent(input: NewEventInput): Promise<AdminEventResult> {
  const staff = await requireStaff();
  const gym = await getGym();
  if (!gym?.events_enabled) return { ok: false, message: "رویدادها برای این باشگاه فعال نیست." };
  const title = input.title.trim();
  if (title.length < 2 || title.length > 80) return { ok: false, message: "عنوان بین ۲ تا ۸۰ حرف باشد." };
  if (!EVENT_KINDS.includes(input.kind)) return { ok: false, message: "نوع معتبر نیست." };
  if (!SCORE_KINDS.includes(input.scoreKind)) return { ok: false, message: "نوع امتیاز معتبر نیست." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.day) || !/^\d{2}:\d{2}$/.test(input.time)) return { ok: false, message: "روز و ساعت را انتخاب کنید." };
  const start = Date.parse(`${input.day}T${input.time}:00${TEHRAN_OFFSET}`);
  if (!Number.isFinite(start) || start < Date.now()) return { ok: false, message: "زمان شروع گذشته است." };
  const hours = Math.max(0.5, Math.min(72, Number(input.hours) || 2));
  const divisions = [...new Set(input.divisions.map((d) => d.trim()).filter(Boolean))].slice(0, 8);
  const capacity = input.capacity && input.capacity > 0 ? Math.min(1000, Math.round(input.capacity)) : null;
  const fee = input.feeToman && input.feeToman > 0 ? Math.round(input.feeToman) : null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .insert({
      title,
      kind: input.kind,
      is_competition: input.isCompetition,
      description: input.description.trim().slice(0, 1000) || null,
      starts_at: new Date(start).toISOString(),
      ends_at: new Date(start + hours * 3_600_000).toISOString(),
      location: input.location.trim().slice(0, 60) || null,
      capacity,
      fee_toman: fee,
      register_until: input.closeHoursBefore ? new Date(start - input.closeHoursBefore * 3_600_000).toISOString() : null,
      divisions: input.isCompetition ? divisions : [],
      score_kind: input.isCompetition ? input.scoreKind : "none",
      lower_is_better: input.isCompetition ? input.lowerIsBetter : false,
      status: input.publish ? "published" : "draft",
      created_by: staff.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: "ثبت نشد." };
  refresh();
  return { ok: true, id: data.id };
}

export async function setEventStatus(id: string, status: EventStatus): Promise<AdminEventResult> {
  await requireStaff();
  if (!["draft", "published", "finished", "cancelled"].includes(status)) return { ok: false, message: "وضعیت معتبر نیست." };
  const supabase = await createClient();
  const { error } = await supabase.from("events").update({ status }).eq("id", id);
  if (error) return { ok: false, message: "ذخیره نشد." };
  refresh(id);
  return { ok: true };
}

export async function deleteEvent(id: string): Promise<AdminEventResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { ok: false, message: "حذف نشد." };
  refresh();
  return { ok: true };
}

/** The desk signs someone up by hand — no capacity or deadline check;
 *  that is the desk's call. */
export async function addParticipant(eventId: string, studentId: string, division: string | null): Promise<AdminEventResult> {
  await requireStaff();
  if (!studentId) return { ok: false, message: "عضو را انتخاب کنید." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_registrations")
    .upsert({ event_id: eventId, student_id: studentId, division, status: "registered" }, { onConflict: "event_id,student_id" });
  if (error) return { ok: false, message: eventErrorMessage(error.message) };
  refresh(eventId);
  return { ok: true };
}

export async function setRegistrationStatus(
  eventId: string,
  registrationId: string,
  status: "registered" | "attended" | "cancelled"
): Promise<AdminEventResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("event_registrations").update({ status, updated_at: new Date().toISOString() }).eq("id", registrationId);
  if (error) return { ok: false, message: "ذخیره نشد." };
  refresh(eventId);
  return { ok: true };
}

/** Records a score. Entering one also marks the athlete as attended —
 *  nobody posts a time without being there. */
export async function saveResult(
  eventId: string,
  studentId: string,
  division: string | null,
  scoreKind: ScoreKind,
  raw: string,
  note: string
): Promise<AdminEventResult> {
  const staff = await requireStaff();
  const score = parseScore(scoreKind, raw);
  if (score === null) return { ok: false, message: scoreKind === "time" ? "زمان را مثل ۱۲:۳۴ بنویسید." : "عدد معتبر نیست." };
  const supabase = await createClient();
  const { error } = await supabase.from("event_results").upsert(
    { event_id: eventId, student_id: studentId, division, score, note: note.trim().slice(0, 200) || null, recorded_by: staff.id },
    { onConflict: "event_id,student_id" }
  );
  if (error) return { ok: false, message: eventErrorMessage(error.message) };
  await supabase
    .from("event_registrations")
    .update({ status: "attended", updated_at: new Date().toISOString() })
    .eq("event_id", eventId)
    .eq("student_id", studentId);
  refresh(eventId);
  return { ok: true };
}

export async function deleteResult(eventId: string, studentId: string): Promise<AdminEventResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("event_results").delete().eq("event_id", eventId).eq("student_id", studentId);
  if (error) return { ok: false, message: "حذف نشد." };
  refresh(eventId);
  return { ok: true };
}
