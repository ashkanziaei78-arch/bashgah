import Link from "next/link";
import { ChevronLeft, ShieldCheck, Ruler, Target, CalendarClock } from "lucide-react";
import { requireProfile, getActiveMembership, sessionsLeft } from "@/lib/data";
import { SignOutButton } from "@/components/sign-out-button";
import { faDigits, faDate, daysUntil } from "@/lib/format";
import { GOAL_LABEL, ACTIVITY_LABEL } from "@/lib/nutrition";

export const metadata = { title: "حساب کاربری" };

const ROLE_LABEL: Record<string, string> = {
  student: "شاگرد",
  coach: "مربی",
  admin: "مدیر باشگاه",
};

export default async function Account() {
  const profile = await requireProfile();
  const membership = await getActiveMembership(profile.id);
  const left = sessionsLeft(membership);

  const facts: Array<[typeof Ruler, string, string]> = [];
  if (profile.height_cm && profile.weight_kg) {
    facts.push([
      Ruler,
      "قد و وزن",
      `${faDigits(profile.height_cm)} سانتی‌متر · ${faDigits(profile.weight_kg)} کیلو`,
    ]);
  }
  if (profile.goal) facts.push([Target, "هدف", GOAL_LABEL[profile.goal]]);
  if (profile.activity_level) {
    facts.push([CalendarClock, "سطح فعالیت", ACTIVITY_LABEL[profile.activity_level]]);
  }

  return (
    <>
      <header className="flex items-center gap-3 pt-5 pb-4">
        <Link
          href="/app"
          aria-label="بازگشت"
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--fc-line2)] text-fc-muted hover:text-fc-text"
        >
          <ChevronLeft className="size-[18px] rotate-180" />
        </Link>
        <h1 className="text-lg">حساب کاربری</h1>
      </header>

      <section className="fc-raised flex items-center gap-4 p-5">
        <span
          className="fc-lat grid size-16 shrink-0 place-items-center rounded-full text-lg font-extrabold text-white"
          style={{ background: "var(--fc-grad)" }}
        >
          {profile.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
        </span>
        <div className="min-w-0 flex-1">
          <b className="block truncate text-base">{profile.full_name}</b>
          <small className="fc-lat block text-[12px] tracking-normal text-fc-muted" dir="ltr">
            {profile.username ?? "—"}
          </small>
          <span className="fc-chip fc-chip-cy mt-2 inline-flex">
            <ShieldCheck className="size-3.5" />
            {ROLE_LABEL[profile.role] ?? profile.role}
          </span>
        </div>
      </section>

      {membership && (
        <>
          <h2 className="mt-6 mb-3 text-[14.5px]">اشتراک</h2>
          <dl className="fc-card list-none px-4 py-1">
            {[
              ["پلن", membership.plans?.name ?? "—"],
              ["جلسه باقی‌مانده", left === null ? "نامحدود" : `${faDigits(left)} جلسه`],
              ["اعتبار تا", faDate(membership.expires_on)],
              ["روز باقی‌مانده", `${faDigits(daysUntil(membership.expires_on))} روز`],
            ].map(([label, value], i) => (
              <div
                key={label}
                className={`flex items-baseline justify-between py-3 ${
                  i > 0 ? "border-t border-[var(--fc-line)]" : ""
                }`}
              >
                <dt className="text-[13px] text-fc-muted">{label}</dt>
                <dd className="text-[13.5px] font-bold">{value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {facts.length > 0 && (
        <>
          <h2 className="mt-6 mb-3 text-[14.5px]">مشخصات بدنی</h2>
          <ul className="fc-card list-none px-4 py-1">
            {facts.map(([Icon, label, value], i) => (
              <li
                key={label}
                className={`flex items-center gap-3 py-3 ${
                  i > 0 ? "border-t border-[var(--fc-line)]" : ""
                }`}
              >
                <Icon className="size-4 shrink-0 text-fc-dim" />
                <span className="flex-1 text-[13px] text-fc-muted">{label}</span>
                <b className="text-[13px]">{value}</b>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11.5px] text-fc-dim">
            برای تغییر این اعداد به مربی بگویید تا در جلسه‌ی بعد به‌روز کند.
          </p>
        </>
      )}

      <div className="mt-7">
        <SignOutButton />
      </div>

      <div className="h-6" />
    </>
  );
}
