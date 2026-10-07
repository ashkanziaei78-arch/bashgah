import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { Credit } from "@/components/credit";
import { LogoMark } from "@/components/brand/logo";
import { requireStaff, getGym } from "@/lib/data";
import { CoachNav } from "@/components/coach/coach-nav";

export const metadata = { title: "پنل مربی" };

export default async function CoachLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Students are bounced to /app here, so no page below this needs to
  // re-check the role for access — only for what it chooses to show.
  const profile = await requireStaff();
  const gym = await getGym();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b fc-chrome">
        <div className="mx-auto flex w-full max-w-[760px] items-center gap-3 px-5 py-3">
          <Link href="/coach" className="flex min-w-0 items-center gap-2.5">
            <LogoMark size={36} className="shrink-0 text-fc-text" />
            <span className="min-w-0">
              <b className="block text-[13.5px] leading-tight">پنل مربی</b>
            </span>
          </Link>

          <Link
            href="/account"
            className="min-w-0 truncate text-[11px] text-fc-muted hover:text-fc-cyan"
          >
            {profile.full_name}
          </Link>

          {profile.role === "admin" ? (
            <Link
              href="/admin"
              className="fc-chip fc-chip-cy ms-auto shrink-0 transition-colors hover:text-fc-text"
            >
              مدیریت باشگاه
            </Link>
          ) : (
            <span className="fc-chip fc-chip-cy ms-auto shrink-0">مربی</span>
          )}
          <SignOutButton compact />
        </div>
        <div className="mx-auto w-full max-w-[760px] px-5">
          <CoachNav showClasses={Boolean(gym?.classes_enabled)} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[760px] flex-1 px-5">{children}</main>
      <footer className="mx-auto w-full max-w-[760px] px-5 pt-2 pb-6">
        <Credit />
      </footer>
    </div>
  );
}
