import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { Credit } from "@/components/credit";
import { LogoMark } from "@/components/brand/logo";
import { requireProfile, getGym } from "@/lib/data";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata = { title: "مدیریت" };

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireProfile();
  // Coaches have a panel of their own; only an admin gets the gym's
  // settings, price list and card register.
  if (profile.role !== "admin") redirect(profile.role === "coach" ? "/coach" : "/app");
  // The platform's own admins have no gym of their own to run.
  if (!profile.gym_id) redirect("/platform");
  const gym = await getGym();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b fc-chrome">
        <div className="mx-auto w-full max-w-[860px] px-5">
          <div className="flex items-center gap-3 py-3">
            <Link href="/admin" className="flex min-w-0 items-center gap-2.5">
              <LogoMark size={36} className="shrink-0 text-fc-text" />
              <span className="min-w-0">
                <b className="block text-[13.5px] leading-tight">مدیریت باشگاه</b>
                {gym && <small className="block text-[11px] text-fc-muted">{gym.name}</small>}
              </span>
            </Link>

            <Link
              href="/account"
              className="min-w-0 truncate text-[11px] text-fc-muted hover:text-fc-cyan"
            >
              {profile.full_name}
            </Link>

            <Link
              href="/coach"
              className="fc-chip ms-auto shrink-0 transition-colors hover:text-fc-cyan"
            >
              پنل مربی
            </Link>
            <SignOutButton compact />
          </div>

          <AdminNav showClasses={Boolean(gym?.classes_enabled)} showEvents={Boolean(gym?.events_enabled)} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[860px] flex-1 px-5">{children}</main>
      <footer className="mx-auto w-full max-w-[860px] px-5 pt-2 pb-6">
        <Credit />
      </footer>
    </div>
  );
}
