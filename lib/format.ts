import { toJalaali } from "jalaali-js";

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

const MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

/** Saturday-first, matching the Iranian week. */
const WEEKDAYS = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];

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
  const d = typeof date === "string" ? new Date(date) : date;
  const { jy, jm, jd } = toJalaali(d);
  return `${faDigits(jd)} ${MONTHS[jm - 1]} ${faDigits(jy)}`;
}

/** "سه‌شنبه، ۲۴ شهریور ۱۴۰۵" */
export function faDateLong(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${WEEKDAYS[d.getDay()]}، ${faDate(d)}`;
}

/** "۱۸:۱۲" — 24-hour, which is what Iranian users expect. */
export function faTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return faDigits(`${hh}:${mm}`);
}

/** Whole days from now until `date`, floored at 0. */
export function daysUntil(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const ms = d.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
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
