/** Calories burned at the gym — and only at the gym.
 *
 *  Every entry comes from something the gym itself recorded: a workout
 *  the member ticked off against their coach's programme, a class the
 *  coach marked them present in, an event they were checked into. No
 *  watch, no step counter, no self-reported run: those numbers can't be
 *  verified by the coach writing the diet, so they don't feed it.
 *
 *  Same formula as `workout-estimate.ts`: kcal = MET × 3.5 × kg / 200
 *  per minute. Kept free of imports so `node --test` can load it. */

export type BurnSource = "workout" | "class" | "event";

export interface BurnEntry {
  /** Tehran calendar day, YYYY-MM-DD. */
  day: string;
  source: BurnSource;
  label: string;
  minutes: number;
  kcal: number;
}

/* Compendium of Physical Activities. Graded for the class as a whole,
 * rest between rounds included — not the peak minute. */
export const CLASS_MET: Record<string, number> = {
  strength: 5.0,
  hiit: 8.0,
  functional: 6.0,
  mobility: 2.5,
  wod: 8.0,
  weightlifting: 6.0,
  gymnastics: 5.0,
  open_gym: 5.0,
};

/* An event mixes effort with standing around; these are the
 * whole-event averages. Watching a match by the pool is barely above
 * sitting, and is counted as such rather than flattered. */
export const EVENT_MET: Record<string, number> = {
  crossfit: 7.0,
  weightlifting: 4.0,
  powerlifting: 4.0,
  bodybuilding: 3.0,
  running: 9.0,
  cycling: 7.0,
  social: 1.5,
  other: 3.0,
};

/** Longest stretch an event is credited for. A day-long competition is
 *  mostly waiting for your heat. */
export const EVENT_CAP_MIN = 180;
const EVENT_DEFAULT_MIN = 90;

export function kcalFor(met: number, minutes: number, bodyweightKg: number): number {
  if (!(met > 0) || !(minutes > 0) || !(bodyweightKg > 0)) return 0;
  return Math.round((met * 3.5 * bodyweightKg * minutes) / 200);
}

export function eventMinutes(startsAt: string, endsAt: string | null): number {
  if (!endsAt) return EVENT_DEFAULT_MIN;
  const m = Math.round((Date.parse(endsAt) - Date.parse(startsAt)) / 60_000);
  if (!(m > 0)) return EVENT_DEFAULT_MIN;
  return Math.min(m, EVENT_CAP_MIN);
}

export function classEntry(
  c: { kind: string; title: string; duration_min: number },
  day: string,
  bodyweightKg: number
): BurnEntry {
  const met = CLASS_MET[c.kind] ?? 5.0;
  return { day, source: "class", label: c.title, minutes: c.duration_min, kcal: kcalFor(met, c.duration_min, bodyweightKg) };
}

export function eventEntry(
  e: { kind: string; title: string; starts_at: string; ends_at: string | null },
  day: string,
  bodyweightKg: number
): BurnEntry {
  const minutes = eventMinutes(e.starts_at, e.ends_at);
  const met = EVENT_MET[e.kind] ?? 3.0;
  return { day, source: "event", label: e.title, minutes, kcal: kcalFor(met, minutes, bodyweightKg) };
}

function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

export interface BurnSummary {
  today: number;
  total: number;
  activeDays: number;
  /** Oldest first, one per day in the window, zeros included. */
  byDay: { day: string; kcal: number }[];
  bySource: Record<BurnSource, number>;
}

/** Totals for the `days` days ending `today`. Entries outside the
 *  window are ignored, so the caller can over-fetch safely. */
export function summariseBurn(entries: BurnEntry[], today: string, days = 7): BurnSummary {
  const window = Array.from({ length: days }, (_, i) => addDays(today, i - days + 1));
  const perDay = new Map(window.map((d) => [d, 0]));
  const bySource: Record<BurnSource, number> = { workout: 0, class: 0, event: 0 };

  for (const e of entries) {
    if (!perDay.has(e.day)) continue;
    perDay.set(e.day, perDay.get(e.day)! + e.kcal);
    bySource[e.source] += e.kcal;
  }

  const byDay = window.map((day) => ({ day, kcal: perDay.get(day)! }));
  return {
    today: perDay.get(today) ?? 0,
    total: byDay.reduce((s, d) => s + d.kcal, 0),
    activeDays: byDay.filter((d) => d.kcal > 0).length,
    byDay,
    bySource,
  };
}

export const SOURCE_LABEL: Record<BurnSource, string> = {
  workout: "تمرین برنامه",
  class: "کلاس",
  event: "رویداد",
};
