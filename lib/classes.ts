/** Group-class timetable logic that does not need a database.
 *
 *  Kept free of imports so `node --test` can load it directly; the
 *  pages layer the Persian date formatting from lib/format on top. */

export type ClassKind =
  | "strength" | "hiit" | "cardio" | "spin" | "yoga" | "boxing" | "mobility" | "other";

export type BookingStatus = "booked" | "waitlisted" | "cancelled" | "attended" | "no_show";

/** One row of public.class_schedule(). */
export interface ScheduledClass {
  id: string;
  series_id: string | null;
  title: string;
  description: string | null;
  kind: ClassKind;
  coach_id: string | null;
  coach_name: string | null;
  starts_at: string;
  duration_min: number;
  capacity: number;
  location: string | null;
  cancelled_at: string | null;
  booked: number;
  waitlisted: number;
  my_status: BookingStatus | null;
  my_position: number | null;
}

export const KIND_LABEL: Record<ClassKind, string> = {
  strength: "قدرتی",
  hiit: "HIIT",
  cardio: "هوازی",
  spin: "اسپینینگ",
  yoga: "یوگا",
  boxing: "بوکس",
  mobility: "تحرک‌پذیری",
  other: "گروهی",
};

export const KINDS = Object.keys(KIND_LABEL) as ClassKind[];

/** Iran has kept a flat UTC+03:30 since it dropped daylight saving in
 *  2022, so a fixed offset is exact and avoids depending on the host's
 *  time-zone database. */
export const TEHRAN_OFFSET = "+03:30";
const OFFSET_MS = 210 * 60_000;
const DAY_MS = 86_400_000;

/** The Tehran calendar day a moment falls on, as YYYY-MM-DD. */
export function tehranDay(at: string | Date): string {
  const t = typeof at === "string" ? Date.parse(at) : at.getTime();
  return new Date(t + OFFSET_MS).toISOString().slice(0, 10);
}

/** "HH:MM" in Tehran. */
export function tehranClock(at: string | Date): string {
  const t = typeof at === "string" ? Date.parse(at) : at.getTime();
  return new Date(t + OFFSET_MS).toISOString().slice(11, 16);
}

function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** The Iranian week (Saturday first) containing `now`, moved by
 *  `offset` weeks. `from`/`to` are the bounds to query with. */
export function tehranWeek(now: Date, offset = 0): { days: string[]; from: string; to: string } {
  const today = tehranDay(now);
  // getUTCDay on the shifted date is the Tehran weekday: 0 Sunday … 6 Saturday.
  const jsDay = new Date(Date.parse(`${today}T00:00:00Z`)).getUTCDay();
  const sinceSaturday = (jsDay + 1) % 7;
  const start = addDays(today, -sinceSaturday + offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return {
    days,
    from: `${days[0]}T00:00:00${TEHRAN_OFFSET}`,
    to: `${addDays(days[6], 1)}T00:00:00${TEHRAN_OFFSET}`,
  };
}

export function groupByDay<T extends { starts_at: string }>(rows: T[]): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const r of [...rows].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))) {
    const key = tehranDay(r.starts_at);
    const list = out.get(key);
    if (list) list.push(r);
    else out.set(key, [r]);
  }
  return out;
}

/** The moment a class ends. */
export function endsAt(c: Pick<ScheduledClass, "starts_at" | "duration_min">): Date {
  return new Date(Date.parse(c.starts_at) + c.duration_min * 60_000);
}

export interface SeatState {
  left: number;
  full: boolean;
  /** 0..1, for the fill bar. Over-booked by the desk reads as full, not 120%. */
  fill: number;
}

export function seats(c: Pick<ScheduledClass, "booked" | "capacity">): SeatState {
  const left = Math.max(0, c.capacity - c.booked);
  return { left, full: left === 0, fill: c.capacity > 0 ? Math.min(1, c.booked / c.capacity) : 1 };
}

/** What the member can do with a class right now. Mirrors the checks
 *  inside book_class/cancel_booking so the button never offers something
 *  the database will refuse — the database still has the final word. */
export type ClassAction =
  | { kind: "book" }
  | { kind: "join_waitlist" }
  | { kind: "cancel" }
  | { kind: "leave_waitlist" }
  | { kind: "locked"; reason: "cancelled" | "started" | "too_late" | "too_early" };

export function classAction(
  c: ScheduledClass,
  now: Date,
  opts: { cancelWindowHours: number; horizonDays: number }
): ClassAction {
  const start = Date.parse(c.starts_at);
  if (c.cancelled_at) return { kind: "locked", reason: "cancelled" };
  if (start <= now.getTime()) return { kind: "locked", reason: "started" };

  if (c.my_status === "waitlisted") return { kind: "leave_waitlist" };
  if (c.my_status === "booked") {
    return start - now.getTime() < opts.cancelWindowHours * 3_600_000
      ? { kind: "locked", reason: "too_late" }
      : { kind: "cancel" };
  }
  if (start > now.getTime() + opts.horizonDays * DAY_MS) return { kind: "locked", reason: "too_early" };
  return seats(c).full ? { kind: "join_waitlist" } : { kind: "book" };
}

/** Persian for every error the class functions raise. Anything unknown
 *  gets a generic line rather than a database message on screen. */
export function classErrorMessage(raw: string | undefined | null): string {
  const code = (raw ?? "").trim();
  const map: Record<string, string> = {
    not_signed_in: "دوباره وارد حساب شوید.",
    class_not_found: "این کلاس دیگر در برنامه نیست.",
    class_cancelled: "این کلاس لغو شده است.",
    class_started: "این کلاس شروع شده است.",
    too_early: "رزرو این کلاس هنوز باز نشده است.",
    no_membership: "برای رزرو، اشتراک فعال با جلسه‌ی باقی‌مانده لازم است.",
    too_late: "زمان لغو گذشته است. برای لغو با پذیرش تماس بگیرید.",
    staff_only: "این کار فقط از پنل مربی ممکن است.",
    booking_not_found: "این رزرو پیدا نشد.",
    not_a_seat: "فقط رزروهای قطعی را می‌شود حضور و غیاب کرد.",
    bad_status: "وضعیت انتخاب‌شده معتبر نیست.",
    range_too_wide: "بازه‌ی زمانی خیلی بلند است.",
  };
  for (const [k, v] of Object.entries(map)) if (code.includes(k)) return v;
  return "انجام نشد. دوباره تلاش کنید.";
}
