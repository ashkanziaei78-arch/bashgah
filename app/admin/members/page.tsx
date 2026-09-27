import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { MemberTable, type MemberRow } from "@/components/admin/member-table";
import { AccountCreator } from "@/components/admin/account-creator";

export const metadata = { title: "اعضا" };

export default async function AdminMembers() {
  const me = await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select(
      `id, full_name, role, username, created_at,
       memberships(expires_on, sessions_total, sessions_used, status, plans(name))`
    )
    .order("role")
    .order("full_name");

  const rows: MemberRow[] = (
    (data ?? []) as {
      id: string;
      full_name: string;
      role: "student" | "coach" | "admin";
      username: string | null;
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
      username: row.username,
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
          حساب بسازید و نقش‌ها را اینجا عوض کنید.
        </p>
      </header>

      <AccountCreator />
      <MemberTable rows={rows} />

      <div className="h-6" />
    </>
  );
}
