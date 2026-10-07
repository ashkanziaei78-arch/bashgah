"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, requireStaff } from "@/lib/data";
import { checkBannerLink } from "@/lib/banners";
import { LEAD_SOURCES, LEAD_STATUSES, normalisePhone, type LeadSource, type LeadStatus } from "@/lib/leads";

export interface EngageResult {
  ok: boolean;
  message?: string;
}

/** Same guard as app/admin/actions.ts: an action is a public endpoint,
 *  so it re-checks the role itself. RLS checks it again. */
async function requireAdmin() {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/coach");
  return profile;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------

export interface AnnouncementInput {
  title: string;
  body: string;
  tone: "info" | "offer" | "alert";
  pinned: boolean;
  publishFrom: string;
  publishUntil: string | null;
  /** Path inside the gym's own folder of the gym-media bucket. */
  imagePath?: string | null;
  link?: string;
  showInBanner?: boolean;
}

export async function saveAnnouncement(input: AnnouncementInput): Promise<EngageResult> {
  const admin = await requireAdmin();
  const title = input.title.trim();
  if (title.length < 2 || title.length > 80) return { ok: false, message: "عنوان بین ۲ تا ۸۰ حرف باشد." };
  if (input.body.length > 600) return { ok: false, message: "متن حداکثر ۶۰۰ حرف باشد." };
  if (!["info", "offer", "alert"].includes(input.tone)) return { ok: false, message: "نوع اطلاعیه معتبر نیست." };
  if (!DAY.test(input.publishFrom)) return { ok: false, message: "تاریخ شروع معتبر نیست." };
  if (input.publishUntil && (!DAY.test(input.publishUntil) || input.publishUntil < input.publishFrom)) {
    return { ok: false, message: "تاریخ پایان باید بعد از شروع باشد." };
  }

  const link = checkBannerLink(input.link ?? "");
  if (!link.ok) return { ok: false, message: "لینک باید آدرس https یا مسیری داخل اپ باشد." };
  const image = input.imagePath?.trim() || null;
  // Storage RLS already keeps uploads inside the gym's folder; this stops
  // a hand-made request from pointing a banner at another gym's photo.
  if (image && !image.startsWith(`${admin.gym_id}/`)) return { ok: false, message: "عکس معتبر نیست." };
  if (input.showInBanner && !image) return { ok: false, message: "برای نمایش در بنر، عکس لازم است." };

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({
    title,
    body: input.body.trim() || null,
    tone: input.tone,
    pinned: input.pinned,
    publish_from: input.publishFrom,
    publish_until: input.publishUntil,
    image_path: image,
    link_url: link.url,
    show_in_banner: Boolean(input.showInBanner && image),
    created_by: admin.id,
  });
  if (error) return { ok: false, message: "اطلاعیه ثبت نشد." };
  revalidatePath("/admin/news");
  revalidatePath("/app");
  return { ok: true };
}

export async function deleteAnnouncement(id: string): Promise<EngageResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { ok: false, message: "حذف نشد." };
  revalidatePath("/admin/news");
  revalidatePath("/app");
  return { ok: true };
}

// ---------------------------------------------------------------
// Leads — the desk works these, so any staff member may
// ---------------------------------------------------------------

export interface LeadInput {
  fullName: string;
  phone: string;
  source: LeadSource;
  interest: string;
  note: string;
  followUpOn: string | null;
}

export async function addLead(input: LeadInput): Promise<EngageResult> {
  const staff = await requireStaff();
  const name = input.fullName.trim();
  if (name.length < 2 || name.length > 80) return { ok: false, message: "نام را وارد کنید." };
  const phone = input.phone.trim() ? normalisePhone(input.phone) : null;
  if (input.phone.trim() && !phone) return { ok: false, message: "شماره تلفن معتبر نیست." };
  if (!LEAD_SOURCES.includes(input.source)) return { ok: false, message: "منبع معتبر نیست." };
  if (input.followUpOn && !DAY.test(input.followUpOn)) return { ok: false, message: "تاریخ پیگیری معتبر نیست." };

  const supabase = await createClient();
  const { error } = await supabase.from("leads").insert({
    full_name: name,
    phone,
    source: input.source,
    interest: input.interest.trim().slice(0, 120) || null,
    note: input.note.trim().slice(0, 1000) || null,
    follow_up_on: input.followUpOn,
    created_by: staff.id,
  });
  if (error) return { ok: false, message: "ثبت نشد." };
  revalidatePath("/admin/leads");
  return { ok: true };
}

export async function updateLead(
  id: string,
  patch: { status?: LeadStatus; followUpOn?: string | null; note?: string }
): Promise<EngageResult> {
  await requireStaff();
  const row: Record<string, unknown> = {};
  if (patch.status !== undefined) {
    if (!LEAD_STATUSES.includes(patch.status)) return { ok: false, message: "وضعیت معتبر نیست." };
    row.status = patch.status;
    // A decided lead needs no more calls.
    if (patch.status === "won" || patch.status === "lost") row.follow_up_on = null;
  }
  if (patch.followUpOn !== undefined) {
    if (patch.followUpOn && !DAY.test(patch.followUpOn)) return { ok: false, message: "تاریخ معتبر نیست." };
    row.follow_up_on = patch.followUpOn;
  }
  if (patch.note !== undefined) row.note = patch.note.trim().slice(0, 1000) || null;

  const supabase = await createClient();
  const { error } = await supabase.from("leads").update(row).eq("id", id);
  if (error) return { ok: false, message: "ذخیره نشد." };
  revalidatePath("/admin/leads");
  return { ok: true };
}

export async function deleteLead(id: string): Promise<EngageResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) return { ok: false, message: "حذف نشد." };
  revalidatePath("/admin/leads");
  return { ok: true };
}
