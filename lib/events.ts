/** Tournaments and events: labels, scores and the sign-up rules the
 *  buttons mirror. Import-free for node --test. */

export type EventKind =
  | "crossfit" | "weightlifting" | "powerlifting" | "bodybuilding"
  | "running" | "cycling" | "social" | "other";
export type EventStatus = "draft" | "published" | "finished" | "cancelled";
export type ScoreKind = "none" | "reps" | "time" | "weight" | "distance" | "points";
export type RegStatus = "registered" | "cancelled" | "attended";

export const EVENT_KIND_LABEL: Record<EventKind, string> = {
  crossfit: "کراسفیت",
  weightlifting: "وزنه‌برداری",
  powerlifting: "پاورلیفتینگ",
  bodybuilding: "بدنسازی",
  running: "دویدن",
  cycling: "دوچرخه‌سواری",
  social: "دورهمی",
  other: "سایر",
};
export const EVENT_KINDS = Object.keys(EVENT_KIND_LABEL) as EventKind[];

export const SCORE_LABEL: Record<ScoreKind, string> = {
  none: "بدون امتیاز",
  reps: "تعداد تکرار",
  time: "زمان",
  weight: "وزنه (کیلو)",
  distance: "مسافت (کیلومتر)",
  points: "امتیاز",
};
export const SCORE_KINDS = Object.keys(SCORE_LABEL) as ScoreKind[];

/** Which way round a score kind usually ranks. Time: faster wins. */
export function defaultLowerIsBetter(kind: ScoreKind): boolean {
  return kind === "time";
}

/** One row of public.event_list(). */
export interface ListedEvent {
  id: string;
  title: string;
  description: string | null;
  kind: EventKind;
  is_competition: boolean;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  capacity: number | null;
  register_until: string | null;
  fee_toman: number | null;
  divisions: string[];
  score_kind: ScoreKind;
  lower_is_better: boolean;
  status: EventStatus;
  registered: number;
  results: number;
  my_status: RegStatus | null;
  my_division: string | null;
}

function latin(s: string): string {
  return s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[٫,]/g, ".")
    .trim();
}

/** What the coach typed into a score box, as the number stored.
 *  Time accepts "12:34", "1:02:03" or plain seconds; everything else a
 *  plain number. Null when it does not parse. */
export function parseScore(kind: ScoreKind, raw: string): number | null {
  const s = latin(raw);
  if (!s) return null;
  if (kind === "time" && s.includes(":")) {
    const parts = s.split(":").map(Number);
    if (parts.length > 3 || parts.some((p) => !Number.isFinite(p) || p < 0)) return null;
    if (parts.slice(1).some((p) => p >= 60)) return null;
    return parts.reduce((acc, p) => acc * 60 + p, 0);
  }
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

/** A stored score as people say it, in Latin digits — the caller turns
 *  them Persian with faDigits. */
export function formatScore(kind: ScoreKind, value: number): string {
  if (kind === "time") {
    const t = Math.round(value);
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const sec = String(t % 60).padStart(2, "0");
    return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
  }
  const num = Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
  const unit = { reps: "تکرار", weight: "کیلو", distance: "کیلومتر", points: "امتیاز", none: "" }[kind];
  return unit ? `${num} ${unit}` : num;
}

export type EventAction =
  | { kind: "register" }
  | { kind: "registered" }
  | { kind: "closed"; reason: "cancelled" | "finished" | "started" | "deadline" | "full" };

export function eventAction(e: ListedEvent, now: Date): EventAction {
  if (e.status === "cancelled") return { kind: "closed", reason: "cancelled" };
  if (e.status === "finished") return { kind: "closed", reason: "finished" };
  if (Date.parse(e.starts_at) <= now.getTime()) return { kind: "closed", reason: "started" };
  if (e.my_status === "registered") return { kind: "registered" };
  if (e.register_until && Date.parse(e.register_until) < now.getTime()) return { kind: "closed", reason: "deadline" };
  if (e.capacity !== null && e.registered >= e.capacity) return { kind: "closed", reason: "full" };
  return { kind: "register" };
}

export function eventErrorMessage(raw: string | null | undefined): string {
  const code = (raw ?? "").trim();
  const map: Record<string, string> = {
    not_signed_in: "دوباره وارد حساب شوید.",
    event_not_found: "این رویداد پیدا نشد.",
    event_closed: "ثبت‌نام این رویداد بسته است.",
    registration_closed: "مهلت ثبت‌نام تمام شده است.",
    pick_division: "رده‌ی مسابقه را انتخاب کنید.",
    event_full: "ظرفیت تکمیل است.",
    event_started: "رویداد شروع شده و دیگر نمی‌شود انصراف داد.",
    gym_mismatch: "این عضو مال باشگاه دیگری است.",
  };
  for (const [k, v] of Object.entries(map)) if (code.includes(k)) return v;
  return "انجام نشد. دوباره تلاش کنید.";
}
