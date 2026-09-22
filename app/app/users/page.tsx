import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { CreateMemberForm } from "@/components/create-member-form";
import { SectionHeading } from "@/components/ui";
import { faDate, faDigits } from "@/lib/format";

export const metadata = { title: "کاربران" };

const ROLE_LABEL: Record<string, string> = {
  student: "شاگرد",
  coach: "مربی",
  admin: "مدیر",
};

const ROLE_CHIP: Record<string, string> = {
  student: "fc-chip",
  coach: "fc-chip fc-chip-cy",
  admin: "fc-chip fc-chip-warn",
};

interface Row {
  id: string;
  username: string | null;
  full_name: string;
  role: string;
  created_at: string;
}

export default async function Users() {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/app");

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, full_name, role, created_at")
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as Row[];
  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.role] = (acc[r.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <header className="pt-5 pb-3.5">
        <h1 className="text-lg">کاربران</h1>
        <p className="text-xs text-fc-dim">
          {faDigits(rows.length)} حساب — {faDigits(counts.student ?? 0)} شاگرد،{" "}
          {faDigits(counts.coach ?? 0)} مربی، {faDigits(counts.admin ?? 0)} مدیر
        </p>
      </header>

      <CreateMemberForm />

      <SectionHeading>همه‌ی حساب‌ها</SectionHeading>
      <ul className="fc-card list-none px-4 py-1">
        {rows.map((r, i) => (
          <li
            key={r.id}
            className={`flex items-center gap-3 py-3 ${
              i > 0 ? "border-t border-[var(--fc-line)]" : ""
            }`}
          >
            <span
              className="fc-avatar size-9 shrink-0 text-2xs"
              style={{ background: "var(--fc-grad)" }}
            >
              {r.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
            </span>
            <div className="min-w-0 flex-1">
              <b className="block truncate text-md">{r.full_name}</b>
              <small className="fc-num block text-xs text-fc-dim" dir="ltr">
                {r.username ?? "—"}
              </small>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className={ROLE_CHIP[r.role] ?? "fc-chip"}>
                {ROLE_LABEL[r.role] ?? r.role}
              </span>
              <small className="text-xs text-fc-dim">{faDate(r.created_at)}</small>
            </div>
          </li>
        ))}
      </ul>

      <div className="h-6" />
    </>
  );
}
