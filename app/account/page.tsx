import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { requireProfile } from "@/lib/data";
import { ChangePassword } from "@/components/change-password";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata = { title: "حساب کاربری" };

const ROLE_LABEL = { student: "شاگرد", coach: "مربی", admin: "مدیر" } as const;

export default async function Account() {
  const profile = await requireProfile();

  // Sign-in is by username, so an account without one cannot manage its
  // own password. Every account made by the panel has one; this catches
  // rows seeded before usernames existed.
  if (!profile.username) redirect(profile.role === "student" ? "/app" : "/coach");

  const home = profile.role === "student" ? "/app" : "/coach";

  return (
    <main className="mx-auto w-full max-w-[560px] px-5">
      <header className="flex items-center gap-3 pt-5 pb-3.5">
        <Link
          href={home}
          aria-label="بازگشت"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-fc-muted hover:text-fc-text"
        >
          <ChevronLeft className="size-5 rotate-180" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg">حساب کاربری</h1>
          <p className="text-xs text-fc-muted">نام کاربری و رمز ورود شما</p>
        </div>
      </header>

      <section className="fc-raised flex items-center gap-4 p-5">
        <span
          className="fc-lat grid size-12 shrink-0 place-items-center rounded-full text-[13px] font-extrabold text-white"
          style={{ background: "var(--fc-grad)" }}
        >
          {profile.full_name.split(" ").map((w) => w[0]).slice(0, 2).join(" ")}
        </span>
        <dl className="min-w-0 flex-1 grid gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <dt className="text-fc-muted">نام</dt>
            <dd className="truncate font-extrabold">{profile.full_name}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <dt className="text-fc-muted">نام کاربری</dt>
            <dd dir="ltr" className="fc-lat font-extrabold text-fc-cyan">
              {profile.username}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <dt className="text-fc-muted">نقش</dt>
            <dd className="flex items-center gap-1.5 font-extrabold">
              {profile.role !== "student" && <ShieldCheck className="size-3.5 text-fc-cyan" />}
              {ROLE_LABEL[profile.role]}
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-3.5">
        <ChangePassword username={profile.username} />
      </div>

      <div className="mt-3.5">
        <SignOutButton />
      </div>

      <div className="h-6" />
    </main>
  );
}
