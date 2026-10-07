/** The owner's numbers, computed from rows the reports page already
 *  fetched. Pure and import-free so the arithmetic is unit-tested
 *  rather than eyeballed on a chart. Everything is on the Tehran
 *  calendar and, for months, the Jalali one: a "month" of revenue is
 *  مهر, not October. */

const TZ = "Asia/Tehran";
export const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

const persianParts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
  timeZone: TZ, year: "numeric", month: "numeric", day: "numeric",
});
const tehranParts = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ, weekday: "short", hour: "numeric", hourCycle: "h23",
});

function toDate(v: string | Date): Date {
  if (v instanceof Date) return v;
  // A bare date column means that calendar day in Tehran, not UTC midnight.
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00+03:30`) : new Date(v);
}

/** { year: 1405, month: 7 } for a moment, on the Jalali calendar in Tehran. */
export function jalali(v: string | Date): { year: number; month: number; day: number } {
  const p = Object.fromEntries(persianParts.formatToParts(toDate(v)).map((x) => [x.type, x.value]));
  return { year: Number(p.year), month: Number(p.month), day: Number(p.day) };
}

export function jalaliMonthKey(v: string | Date): string {
  const j = jalali(v);
  return `${j.year}-${String(j.month).padStart(2, "0")}`;
}

/** The last `count` Jalali month keys ending with the current one, oldest first. */
export function lastMonths(now: Date, count: number): string[] {
  const j = jalali(now);
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    let m = j.month - i;
    let y = j.year;
    while (m < 1) { m += 12; y -= 1; }
    out.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return out;
}

export function monthLabel(key: string): string {
  return JALALI_MONTHS[Number(key.slice(5, 7)) - 1] ?? key;
}

export interface MonthTotal { key: string; label: string; total: number; count: number }

/** Money in per Jalali month. Refunds are negative payments and net out. */
export function revenueByMonth(
  payments: { amount_toman: number; paid_at: string }[],
  now: Date,
  months = 6
): MonthTotal[] {
  const keys = lastMonths(now, months);
  const map = new Map(keys.map((k) => [k, { key: k, label: monthLabel(k), total: 0, count: 0 }]));
  for (const p of payments) {
    const row = map.get(jalaliMonthKey(p.paid_at));
    if (row) { row.total += Number(p.amount_toman) || 0; row.count += 1; }
  }
  return keys.map((k) => map.get(k)!);
}

/** Percent change, or null when there is nothing to compare against. */
export function change(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

const WEEK_ORDER = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
export const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 → 23:00

/** Door entries by Iranian weekday (Saturday = 0) and hour, the gym's
 *  busy map. Hours before six fold into six, so a 05:40 opener still counts. */
export function attendanceGrid(checkins: { at: string }[]): {
  grid: number[][];
  max: number;
  peak: { weekday: number; hour: number; count: number } | null;
  byWeekday: number[];
} {
  const grid = WEEK_ORDER.map(() => HOURS.map(() => 0));
  for (const c of checkins) {
    const p = Object.fromEntries(tehranParts.formatToParts(toDate(c.at)).map((x) => [x.type, x.value]));
    const d = WEEK_ORDER.indexOf(p.weekday);
    const h = Math.min(23, Math.max(6, Number(p.hour)));
    if (d >= 0) grid[d][h - 6] += 1;
  }
  let max = 0;
  let peak: { weekday: number; hour: number; count: number } | null = null;
  grid.forEach((row, d) =>
    row.forEach((n, i) => {
      if (n > max) { max = n; peak = { weekday: d, hour: HOURS[i], count: n }; }
    })
  );
  return { grid, max, peak, byWeekday: grid.map((r) => r.reduce((a, b) => a + b, 0)) };
}

export interface MembershipRow {
  student_id: string;
  status: "active" | "expired" | "frozen";
  started_on: string;
  expires_on: string;
}

function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

/** Who is in, who is paused, who is about to go and who just went. */
export function memberCounts(rows: MembershipRow[], today: string) {
  const live = new Set<string>();
  const frozen = new Set<string>();
  const expiring = new Set<string>();
  for (const m of rows) {
    if (m.status === "active" && m.expires_on >= today) {
      live.add(m.student_id);
      if (m.expires_on <= addDays(today, 7)) expiring.add(m.student_id);
    }
    if (m.status === "frozen") frozen.add(m.student_id);
  }
  // Lapsed: their newest subscription ended in the last 30 days and
  // nothing has replaced it. These are the people worth a phone call.
  const newest = new Map<string, MembershipRow>();
  for (const m of rows) {
    const cur = newest.get(m.student_id);
    if (!cur || m.expires_on > cur.expires_on) newest.set(m.student_id, m);
  }
  let lapsed = 0;
  for (const [id, m] of newest) {
    if (live.has(id) || frozen.has(id)) continue;
    if (m.expires_on < today && m.expires_on >= addDays(today, -30)) lapsed += 1;
  }
  // A student renewing early has two active rows briefly; count people.
  for (const id of frozen) live.delete(id);
  return { active: live.size, frozen: frozen.size, expiring: expiring.size, lapsed };
}

/** Of the subscriptions that ended between 90 and 14 days ago — long
 *  enough ago that the member has had two weeks to come back — how many
 *  were followed by a new one starting within those two weeks (or up to
 *  a week early, for people who renew before they run out). */
export function renewalRate(rows: MembershipRow[], today: string, graceDays = 14) {
  const from = addDays(today, -90);
  const until = addDays(today, -graceDays);
  const byStudent = new Map<string, MembershipRow[]>();
  for (const m of rows) {
    const list = byStudent.get(m.student_id) ?? [];
    list.push(m);
    byStudent.set(m.student_id, list);
  }
  let eligible = 0;
  let renewed = 0;
  for (const m of rows) {
    if (m.expires_on < from || m.expires_on > until) continue;
    eligible += 1;
    const next = (byStudent.get(m.student_id) ?? []).some(
      (o) => o !== m && o.started_on > addDays(m.expires_on, -7) && o.started_on <= addDays(m.expires_on, graceDays)
    );
    if (next) renewed += 1;
  }
  return { eligible, renewed, rate: eligible ? Math.round((renewed / eligible) * 100) : null };
}

export interface ClassRow {
  title: string;
  capacity: number;
  cancelled_at: string | null;
  statuses: string[];
}

/** How full the classes ran, how many who booked actually came, and
 *  which titles earn their slot. Cancelled sessions are left out — an
 *  empty class the gym called off is not a class nobody wanted. */
export function classStats(rows: ClassRow[]) {
  const live = rows.filter((r) => !r.cancelled_at);
  let seats = 0;
  let taken = 0;
  let came = 0;
  let missed = 0;
  const byTitle = new Map<string, { title: string; sessions: number; seats: number; taken: number }>();
  for (const r of live) {
    const t = r.statuses.filter((s) => s === "booked" || s === "attended" || s === "no_show").length;
    seats += r.capacity;
    taken += Math.min(t, r.capacity);
    came += r.statuses.filter((s) => s === "attended").length;
    missed += r.statuses.filter((s) => s === "no_show").length;
    const agg = byTitle.get(r.title) ?? { title: r.title, sessions: 0, seats: 0, taken: 0 };
    agg.sessions += 1; agg.seats += r.capacity; agg.taken += Math.min(t, r.capacity);
    byTitle.set(r.title, agg);
  }
  const ranking = [...byTitle.values()]
    .map((a) => ({ ...a, fill: a.seats ? Math.round((a.taken / a.seats) * 100) : 0 }))
    .sort((a, b) => b.fill - a.fill || b.sessions - a.sessions);
  return {
    sessions: live.length,
    fill: seats ? Math.round((taken / seats) * 100) : null,
    showUp: came + missed ? Math.round((came / (came + missed)) * 100) : null,
    ranking,
  };
}
