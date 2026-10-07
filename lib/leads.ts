/** Enquiry pipeline helpers. Import-free for node --test. */

export type LeadStatus = "new" | "contacted" | "trial" | "won" | "lost";
export type LeadSource = "walk_in" | "phone" | "instagram" | "referral" | "website" | "other";

export const LEAD_STATUS: Record<LeadStatus, string> = {
  new: "تازه",
  contacted: "تماس گرفته شد",
  trial: "جلسه‌ی آزمایشی",
  won: "عضو شد",
  lost: "منصرف شد",
};
export const LEAD_STATUSES = Object.keys(LEAD_STATUS) as LeadStatus[];

export const LEAD_SOURCE: Record<LeadSource, string> = {
  walk_in: "حضوری",
  phone: "تلفنی",
  instagram: "اینستاگرام",
  referral: "معرفی دوستان",
  website: "سایت",
  other: "سایر",
};
export const LEAD_SOURCES = Object.keys(LEAD_SOURCE) as LeadSource[];

/** "۰۹۱۲ ۱۲۳-۴۵۶۷" → "09121234567". Null when nothing usable is left,
 *  matching the database's phone_digits check. */
export function normalisePhone(raw: string): string | null {
  const s = raw
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[^\d+]/g, "");
  return /^[0-9+]{7,15}$/.test(s) ? s : null;
}

/** Where a follow-up date stands against today (both YYYY-MM-DD). */
export function followUp(date: string | null, today: string): "overdue" | "today" | "upcoming" | null {
  if (!date) return null;
  if (date < today) return "overdue";
  if (date === today) return "today";
  return "upcoming";
}

/** Of the enquiries that reached a verdict, how many joined. Open ones
 *  are left out: a lead from yesterday has not failed yet. */
export function conversion(rows: { status: LeadStatus }[]): { decided: number; won: number; rate: number | null } {
  const won = rows.filter((r) => r.status === "won").length;
  const decided = won + rows.filter((r) => r.status === "lost").length;
  return { decided, won, rate: decided ? Math.round((won / decided) * 100) : null };
}

/** Open leads first by urgency — overdue, due today, then the rest by
 *  date — so the desk works the list top to bottom. */
export function sortLeads<T extends { status: LeadStatus; follow_up_on: string | null; created_at: string }>(
  rows: T[],
  today: string
): T[] {
  const rank = (r: T) => {
    if (r.status === "won" || r.status === "lost") return 4;
    const f = followUp(r.follow_up_on, today);
    return f === "overdue" ? 0 : f === "today" ? 1 : f === "upcoming" ? 2 : 3;
  };
  return [...rows].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (a.follow_up_on ?? "9999").localeCompare(b.follow_up_on ?? "9999") ||
      b.created_at.localeCompare(a.created_at)
  );
}
