import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/** Service-role client. Bypasses row level security entirely, so it must
 *  never be imported into a client component — only server actions and
 *  route handlers that have already checked the caller's role. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const MISSING_SERVICE_KEY =
  "کلید سرویس تنظیم نشده. متغیر SUPABASE_SERVICE_ROLE_KEY را در تنظیمات سرور اضافه کنید تا ساخت کاربر فعال شود.";
