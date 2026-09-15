import { toJalaali } from "jalaali-js";

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

const MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

const WEEKDAY: Record<string, string> = {
  Sat: "شنبه", Sun: "یکشنبه", Mon: "دوشنبه", Tue: "سه‌شنبه",
  Wed: "چهارشنبه", Thu: "پنجشنبه", Fri: "جمعه",
};

/** The gym is in Tehran. Server rendering happens wherever the app is
 *  deployed — UTC on most hosts — so every date and time is resolved in
 *  this zone explicitly rather than reading the server's clock. Without
 *  this, a 20:30 check-in shows as 17:00 in production. */
const TZ = "Asia/Tehran";

const PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  weekday: "short",
  hour12: false,
});

interface TehranTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: string;
}

function tehran(input: Date | string): TehranTime {
  const d = typeof input === "string" ? parseLoose(input) : input;
  const p = Object.fromEntries(
    PARTS.formatToParts(d).map((part) => [part.type, part.value])
  ) as Record<string, string>;

  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    // Intl emits "24" for midnight under hour12: false
    hour: p.hour === "24" ? 0 : Number(p.hour),
    minute: Number(p.minute),
    weekday: p.weekday,
  };
}

/** A bare "2026-09-27" from a Postgres `date` column parses as UTC
 *  midnight, which lands on the previous day in Tehran. Treat those as
 *  local calendar dates instead. */
function parseLoose(value: string): Date {
  const bare = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (bare) return new Date(Number(bare[1]), Number(bare[2]) - 1, Number(bare[3]), 12);
  return new Date(value);
}

/** Converts every ASCII digit in a string to its Persian form. */
export function faDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

/** Groups thousands then converts to Persian digits: 6000000 → ۶٬۰۰۰٬۰۰۰ */
export function faNumber(n: number): string {
  return faDigits(n.toLocaleString("en-US").replace(/,/g, "٬"));
}

/** Toman with unit: 6000000 → ۶٬۰۰۰٬۰۰۰ تومان */
export function faToman(n: number): string {
  return `${faNumber(n)} تومان`;
}

/** "۲۴ شهریور ۱۴۰۵" */
export function faDate(date: Date | string): string {
  const t = tehran(date);
  const { jy, jm, jd } = toJalaali(t.year, t.month, t.day);
  return `${faDigits(jd)} ${MONTHS[jm - 1]} ${faDigits(jy)}`;
}

/** "سه‌شنبه، ۲۴ شهریور ۱۴۰۵" */
export function faDateLong(date: Date | string): string {
  const t = tehran(date);
  return `${WEEKDAY[t.weekday] ?? ""}، ${faDate(date)}`;
}

/** "۱۸:۱۲" — 24-hour, which is what Iranian users expect. */
export function faTime(date: Date | string): string {
  const t = tehran(date);
  return faDigits(
    `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`
  );
}

/** Weekday index with Saturday = 0, matching the Iranian week. */
export function faWeekdayIndex(date: Date | string): number {
  const order = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
  return order.indexOf(tehran(date).weekday);
}

/** Whole calendar days from today in Tehran until `date`, floored at 0. */
export function daysUntil(date: Date | string): number {
  const target = tehran(date);
  const now = tehran(new Date());
  const toUTC = (t: TehranTime) => Date.UTC(t.year, t.month - 1, t.day);
  return Math.max(0, Math.round((toUTC(target) - toUTC(now)) / 86_400_000));
}

/** Today in Tehran as YYYY-MM-DD, for `date` columns. */
export function todayInTehran(): string {
  const t = tehran(new Date());
  return `${t.year}-${String(t.month).padStart(2, "0")}-${String(t.day).padStart(2, "0")}`;
}

/** Normalises an Iranian mobile number to E.164: 09123456789 → +989123456789 */
export function toE164(raw: string): string | null {
  const digits = raw
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/\D/g, "");

  if (/^09\d{9}$/.test(digits)) return `+98${digits.slice(1)}`;
  if (/^989\d{9}$/.test(digits)) return `+${digits}`;
  if (/^9\d{9}$/.test(digits)) return `+98${digits}`;
  return null;
}
