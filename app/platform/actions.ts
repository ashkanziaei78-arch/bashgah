"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isPlatformAdmin } from "@/lib/data";
import type { UserRole } from "@/lib/supabase/types";

export interface PlatformResult {
  ok: boolean;
  message?: string;
  id?: string;
}

/** Every action re-checks: an action is a public endpoint. The database
 *  checks again inside each platform_* function. */
async function requirePlatform() {
  await requireProfile();
  if (!(await isPlatformAdmin())) redirect("/app");
}

export async function createGym(input: {
  name: string;
  slug: string;
  kind: "bodybuilding" | "crossfit";
}): Promise<PlatformResult> {
  await requirePlatform();
  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();
  if (name.length < 2 || name.length > 60) return { ok: false, message: "نام باشگاه بین ۲ تا ۶۰ حرف باشد." };
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) return { ok: false, message: "شناسه فقط حروف انگلیسی کوچک، عدد و خط تیره." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("platform_create_gym", { p_name: name, p_slug: slug, p_kind: input.kind });
  if (error) {
    return { ok: false, message: error.code === "23505" ? "این شناسه قبلاً استفاده شده." : "ساخت باشگاه انجام نشد." };
  }
  revalidatePath("/platform");
  return { ok: true, id: data as string };
}

export async function updateGym(input: {
  id: string;
  name: string;
  kind: "bodybuilding" | "crossfit";
  classes: boolean;
  events: boolean;
  active: boolean;
}): Promise<PlatformResult> {
  await requirePlatform();
  const supabase = await createClient();
  const { error } = await supabase.rpc("platform_update_gym", {
    p_gym: input.id,
    p_name: input.name.trim(),
    p_kind: input.kind,
    p_classes: input.classes,
    p_events: input.events,
    p_active: input.active,
  });
  if (error) return { ok: false, message: "ذخیره نشد." };
  revalidatePath("/platform");
  revalidatePath(`/platform/${input.id}`);
  return { ok: true };
}

export async function createGymUser(input: {
  gymId: string;
  username: string;
  password: string;
  fullName: string;
  role: UserRole;
}): Promise<PlatformResult> {
  await requirePlatform();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_create_user", {
    p_username: input.username.trim().toLowerCase(),
    p_password: input.password,
    p_full_name: input.fullName.trim(),
    p_role: input.role,
    p_gym: input.gymId,
  });
  if (error) {
    const message =
      error.code === "23505"
        ? "این نام کاربری قبلاً گرفته شده."
        : error.code === "22023"
          ? "نام کاربری (۳ تا ۳۲ حرف انگلیسی کوچک، عدد یا _) یا رمز (حداقل ۸ حرف) درست نیست."
          : "ساخت حساب انجام نشد.";
    return { ok: false, message };
  }
  revalidatePath(`/platform/${input.gymId}`);
  return { ok: true };
}
