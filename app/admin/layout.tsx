import { redirect } from "next/navigation";
import Link from "next/link";
import { requireProfile } from "@/lib/data";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata = { title: "مدیریت" };

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireProfile();
  // Coaches have a panel of their own; only an admin gets the gym's
  // settings, price list and card register.
  if (profile.role !== "admin") redirect(profile.role === "coach" ? "/coach" : "/app");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-[rgba(255,255,255,.1)] bg-[rgba(255,255,255,.055)] backdrop-blur-xl backdrop-saturate-150 supports-[not(backdrop-filter:blur(1px))]:bg-fc-glass">
        <div className="mx-auto w-full max-w-[860px] px-5">
          <div className="flex items-center gap-3 py-3">
            <Link href="/admin" className="flex min-w-0 items-center gap-2.5">
              <span
                className="fc-lat grid size-9 shrink-0 place-items-center rounded-full text-[12px] font-extrabold text-white"
                style={{ background: "var(--fc-grad)" }}
              >
                FC
              </span>
              <span className="min-w-0">
                <b className="block text-[13.5px] leading-tight">مدیریت باشگاه</b>
                <small className="block truncate text-[11px] text-fc-muted">
                  {profile.full_name}
                </small>
              </span>
            </Link>

            <Link
              href="/coach"
              className="fc-chip ms-auto shrink-0 transition-colors hover:text-fc-cyan"
            >
              پنل مربی
            </Link>
          </div>

          <AdminNav />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[860px] flex-1 px-5">{children}</main>
    </div>
  );
}
