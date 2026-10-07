import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile, isPlatformAdmin } from "@/lib/data";

export const metadata = { title: "پنل آماریا" };

/** The platform: every gym that runs on this app. Only platform admins —
 *  everyone else is sent to their own gym's panel. */
export default async function PlatformLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireProfile();
  if (!(await isPlatformAdmin())) redirect(profile.role === "student" ? "/app" : "/coach");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-[rgba(255,255,255,.1)] bg-[rgba(255,255,255,.055)] backdrop-blur-xl supports-[not(backdrop-filter:blur(1px))]:bg-fc-glass">
        <div className="mx-auto flex w-full max-w-[860px] items-center gap-3 px-5 py-3">
          <Link href="/platform" className="flex items-center gap-2.5">
            <span className="fc-lat grid size-9 place-items-center rounded-full text-[11px] font-extrabold text-white" style={{ background: "var(--fc-grad)" }}>
              AM
            </span>
            <span>
              <b className="block text-[13.5px] leading-tight">پنل آماریا</b>
              <small className="text-[11px] text-fc-muted">مدیریت همه‌ی باشگاه‌ها</small>
            </span>
          </Link>
          <Link href="/account" className="ms-auto text-[11px] text-fc-muted hover:text-fc-cyan">{profile.full_name}</Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[860px] flex-1 px-5">{children}</main>
    </div>
  );
}
