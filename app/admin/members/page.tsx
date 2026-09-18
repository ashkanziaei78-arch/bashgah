import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { MemberTable, type MemberRow } from "@/components/admin/member-table";

export const metadata = { title: "اعضا" };

export default async function AdminMembers() {
  const me = await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select(
      `id, full_name, role, created_at,
       memberships(expires_on, sessions_total, sessions_used, status, plans(name))`
    )
    .order("role")
    .order("full_name");

  const rows: MemberRow[] = (
    (data ?? []) as {
      id: string;
      full_name: string;
      role: "student" | "coach" | "admin";
      memberships: {
        expires_on: string;
        sessions_total: number | null;
        sessions_used: number;
        status: string;
        plans: { name: string } | { name: string }[] | null;
      }[];
    }[]
  ).map((row) => {
    const active = row.memberships?.find((m) => m.status === "active");
    const plan = active ? (Array.isArray(active.plans) ? active.plans[0] : active.plans) : null;

    return {
      id: row.id,
      fullName: row.full_name || "بدون نام",
      role: row.role,
      isSelf: row.id === me.id,
      planName: plan?.name ?? null,
      expiresOn: active?.expires_on ?? null,
      sessionsLeft:
        active && active.sessions_total !== null
          ? Math.max(0, active.sessions_total - active.sessions_used)
          : null,
    };
  });

  return (
    <>
      <header className="pt-5 pb-3.5">
        <h1 className="text-lg">اعضا</h1>
        <p className="text-xs text-fc-muted">
          نقش هر حساب را اینجا عوض کنید. ساخت حساب تازه کار پذیرش است.
        </p>
      </header>

      <MemberTable rows={rows} />

      <p className="fc-card mt-4 p-4 text-[12.5px] leading-relaxed text-fc-muted">
        ساخت حساب جدید از این صفحه ممکن نیست: افزودن کاربر به سیستم ورود، کلید
        سرویس (<code dir="ltr" className="fc-lat text-[11px] text-fc-text">SUPABASE_SERVICE_ROLE_KEY</code>)
        می‌خواهد که عمداً در این نسخه تنظیم نشده. تا وقتی تنظیم نشود، حساب‌ها را
        از داشبورد Supabase بسازید.
      </p>

      <div className="h-6" />
    </>
  );
}
