import { createClient } from "@/lib/supabase/server";
import { estimateWorkout, type Level } from "@/lib/workout-estimate";
import { tehranDay } from "@/lib/classes";
import { classEntry, eventEntry, summariseBurn, type BurnEntry } from "@/lib/gym-burn";

type Supabase = Awaited<ReturnType<typeof createClient>>;

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

/** The last week of activity the gym itself recorded for this member —
 *  see lib/gym-burn.ts for why nothing else counts. */
export async function loadGymBurn(supabase: Supabase, studentId: string, kg: number) {
  const now = new Date();
  const today = tehranDay(now);
  const fromDay = new Date(Date.parse(`${today}T00:00:00Z`) - 6 * 86_400_000).toISOString().slice(0, 10);
  const fromAt = `${fromDay}T00:00:00+03:30`;

  const [logs, classes, events] = await Promise.all([
    supabase
      .from("workout_logs")
      .select("performed_on, program_items(sets, rest_seconds, exercises(duration_seconds, level))")
      .eq("student_id", studentId)
      .eq("completed", true)
      .gte("performed_on", fromDay),
    supabase
      .from("class_bookings")
      .select("class_sessions!inner(kind, title, starts_at, duration_min)")
      .eq("student_id", studentId)
      .eq("status", "attended")
      .gte("class_sessions.starts_at", fromAt),
    supabase
      .from("event_registrations")
      .select("events!inner(kind, title, starts_at, ends_at)")
      .eq("student_id", studentId)
      .eq("status", "attended")
      .gte("events.starts_at", fromAt),
  ]);

  type Ex = { duration_seconds: number | null; level: Level | null };
  type Item = { sets: number; rest_seconds: number; exercises: Ex | Ex[] | null };
  const perDay = new Map<string, Parameters<typeof estimateWorkout>[0]>();
  for (const row of (logs.data ?? []) as { performed_on: string; program_items: Item | Item[] | null }[]) {
    const it = one(row.program_items);
    if (!it) continue;
    const ex = one(it.exercises);
    const list = perDay.get(row.performed_on) ?? [];
    list.push({
      sets: it.sets,
      restSeconds: it.rest_seconds,
      durationSeconds: ex?.duration_seconds ?? null,
      level: ex?.level ?? null,
    });
    perDay.set(row.performed_on, list);
  }

  const entries: BurnEntry[] = [];
  for (const [day, items] of perDay) {
    const est = estimateWorkout(items, kg);
    entries.push({ day, source: "workout", label: "تمرین", minutes: est.minutes, kcal: est.kcal ?? 0 });
  }
  type Cls = { kind: string; title: string; starts_at: string; duration_min: number };
  for (const row of (classes.data ?? []) as { class_sessions: Cls | Cls[] | null }[]) {
    const c = one(row.class_sessions);
    if (c) entries.push(classEntry(c, tehranDay(c.starts_at), kg));
  }
  type Ev = { kind: string; title: string; starts_at: string; ends_at: string | null };
  for (const row of (events.data ?? []) as { events: Ev | Ev[] | null }[]) {
    const e = one(row.events);
    if (e) entries.push(eventEntry(e, tehranDay(e.starts_at), kg));
  }

  return summariseBurn(entries, today);
}

export const metadata = { title: "تغذیه" };

