import Link from "next/link";
import { requireStaff } from "@/lib/data";

export const metadata = { title: "پنل مربی" };

export default async function CoachLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Students are bounced to /app here, so no page below this needs to
  // re-check the role for access — only for what it chooses to show.
  const profile = await requireStaff();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-[rgba(255,255,255,.1)] bg-[rgba(255,255,255,.055)] backdrop-blur-xl backdrop-saturate-150 supports-[not(backdrop-filter:blur(1px))]:bg-fc-glass">
        <div className="mx-auto flex w-full max-w-[760px] items-center gap-3 px-5 py-3">
          <Link href="/coach" className="flex min-w-0 items-center gap-2.5">
            <span
              className="fc-lat grid size-9 shrink-0 place-items-center rounded-full text-[12px] font-extrabold text-white"
              style={{ background: "var(--fc-grad)" }}
            >
              FC
            </span>
            <span className="min-w-0">
              <b className="block text-[13.5px] leading-tight">پنل مربی</b>
              <small className="block truncate text-[11px] text-fc-dim">
                {profile.full_name}
              </small>
            </span>
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
        </div>
      </header>

      <main className="mx-auto w-full max-w-[760px] flex-1 px-5">{children}</main>
    </div>
  );
}
