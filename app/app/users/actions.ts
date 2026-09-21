"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, MISSING_SERVICE_KEY } from "@/lib/supabase/admin";
import { normalizeUsername, usernameProblem, usernameToEmail } from "@/lib/auth";
import { toE164 } from "@/lib/format";
import type { UserRole } from "@/lib/supabase/types";

export interface ActionResult {
  ok: boolean;
  message: string;
}

/** Creating an auth user needs the service role, so the caller's own role
 *  is checked first against their session — never trusted from the form. */
async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return data?.role === "admin";
}

export async function createMember(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, message: "فقط مدیر باشگاه می‌تواند کاربر بسازد." };
  }

  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "student") as UserRole;
  const rawPhone = String(formData.get("phone") ?? "").trim();

  const nameProblem = usernameProblem(username);
  if (nameProblem) return { ok: false, message: nameProblem };
  if (password.length < 8)
    return { ok: false, message: "رمز عبور حداقل ۸ کاراکتر باشد." };
  if (!fullName) return { ok: false, message: "نام و نام خانوادگی را وارد کنید." };
  if (!["student", "coach", "admin"].includes(role))
    return { ok: false, message: "نقش انتخاب‌شده معتبر نیست." };

  const phone = rawPhone ? toE164(rawPhone) : null;
  if (rawPhone && !phone)
    return { ok: false, message: "شماره موبایل درست نیست. مثل ۰۹۱۲۳۴۵۶۷۸۹." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, message: MISSING_SERVICE_KEY };

  const { data: created, error } = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error || !created.user) {
    const taken = error?.message?.includes("already");
    return {
      ok: false,
      message: taken
        ? "این نام کاربری قبلاً گرفته شده."
        : "ساخت کاربر انجام نشد. دوباره تلاش کنید.",
    };
  }

  // The phone is a separate step: if the phone provider is off, attaching
  // it fails, and losing the whole account over that would be worse than
  // having one member without a number on file.
  if (phone) {
    await admin.auth.admin.updateUserById(created.user.id, {
      phone,
      phone_confirm: true,
    });
  }

  // A trigger already inserted the profile row; fill in what it cannot know.
  const { error: profileError } = await admin
    .from("profiles")
    .update({ username, full_name: fullName, role, phone })
    .eq("id", created.user.id);

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return {
      ok: false,
      message: "ذخیره‌ی مشخصات انجام نشد، حساب ساخته‌شده هم حذف شد.",
    };
  }

  revalidatePath("/app/users");
  return { ok: true, message: `کاربر «${fullName}» با نام کاربری ${username} ساخته شد.` };
}

export async function resetPassword(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, message: "فقط مدیر باشگاه می‌تواند رمز را بازنشانی کند." };
  }

  const userId = String(formData.get("user_id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8)
    return { ok: false, message: "رمز عبور حداقل ۸ کاراکتر باشد." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, message: MISSING_SERVICE_KEY };

  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return { ok: false, message: "بازنشانی رمز انجام نشد." };

  revalidatePath("/app/users");
  return { ok: true, message: "رمز عبور عوض شد." };
}
