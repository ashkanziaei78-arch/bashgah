import { notFound } from "next/navigation";
import { Nfc, CreditCard, LogIn, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, getActiveMembership, sessionsLeft, getSetting } from "@/lib/data";
import { faDigits, faDate, faTime, daysUntil } from "@/lib/format";
import { SectionHeading, StatRow } from "@/components/ui";

export const metadata = { title: "ورود و خروج" };

export default async function Checkin() {
  const enabled = await getSetting<boolean>("checkin_module_enabled", true);
  if (!enabled) notFound();

  const profile = await requireProfile();
  const membership = await getActiveMembership(profile.id);
  const supabase = await createClient();

  const [{ data: card }, { data: history }] = await Promise.all([
    supabase
      .from("cards")
      .select("uid, label, active")
      .eq("student_id", profile.id)
      .eq("active", true)
      .maybeSingle(),
    supabase
      .from("checkins")
      .select("id, kind, at, deducted")
      .eq("student_id", profile.id)
      .order("at", { ascending: false })
      .limit(12),
  ]);

  const left = sessionsLeft(membership);
  const days = membership ? daysUntil(membership.expires_on) : 0;
  const used = membership?.sessions_used ?? 0;

  return (
    <>
      <header className="pt-6 pb-4">
        <h1 className="text-xl">ورود و خروج</h1>
        <p className="text-xs text-fc-dim">
          {membership
            ? `اشتراک ${membership.plans?.name} · تا ${faDate(membership.expires_on)}`
            : "اشتراک فعالی ندارید"}
        </p>
      </header>

      <section className="fc-hero fc-rise p-7 text-center">
        {/* The screen's whole job is "hold your card here", so the target
            pulses outward the way a contactless reader does — but only
            once a card actually exists to tap. */}
        <div
          className={`${card ? "fc-beacon " : ""}relative mx-auto mb-6 grid size-28 place-items-center rounded-full border border-fc-cyan/30 bg-fc-cyan/10 text-fc-cyan`}
        >
          <Nfc className="size-11" strokeWidth={1.6} aria-hidden />
        </div>
        <h2 className="mb-2 text-lg">
          {card ? "کارت شما فعال است" : "هنوز کارتی برایتان صادر نشده"}
        </h2>
        <p className="mx-auto max-w-[32ch] text-sm leading-relaxed text-fc-muted">
          {card
            ? "کارت را روی دستگاه کنار درِ باشگاه بزنید. همان لحظه یک جلسه از اشتراکتان کم می‌شود و اینجا به‌روز می‌شود."
            : "به پذیرش باشگاه مراجعه کنید تا کارت NFC برایتان صادر و به حسابتان وصل شود."}
        </p>
        {card && (
          <p className="fc-chip fc-chip-cy mt-5 inline-flex">
            <CreditCard className="size-3.5" aria-hidden />
            {card.label ?? `کارت ${faDigits(card.uid.slice(-4))}`}
          </p>
        )}
      </section>

      <StatRow
        stats={[
          { label: "جلسه مانده", value: left === null ? "∞" : faDigits(left), tone: "cyan" },
          { label: "روز مانده", value: faDigits(days), tone: days <= 5 ? "bad" : "warn" },
          { label: "جلسه رفته", value: faDigits(used), tone: "ok" },
        ]}
      />

      <SectionHeading>تاریخچه</SectionHeading>
      {history && history.length > 0 ? (
        <ul className="fc-card fc-rise list-none px-4 py-1">
          {history.map(
            (h: { id: string; kind: "in" | "out"; at: string; deducted: boolean }, i) => (
              <li
                key={h.id}
                className={`flex items-center gap-3 py-3 ${
                  i > 0 ? "border-t border-[var(--fc-line)]" : ""
                }`}
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full ${
                    h.kind === "in"
                      ? "bg-fc-ok/12 text-fc-ok"
                      : "bg-[var(--fc-track)] text-fc-dim"
                  }`}
                >
                  {h.kind === "in" ? (
                    <LogIn className="size-4" aria-hidden />
                  ) : (
                    <LogOut className="size-4" aria-hidden />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <b className="block text-sm">{h.kind === "in" ? "ورود" : "خروج"}</b>
                  <small className="block text-xs text-fc-dim">
                    {faDate(h.at)}
                    {h.deducted ? " · یک جلسه کم شد" : ""}
                  </small>
                </div>
                <span className="fc-num shrink-0 text-md text-fc-muted">
                  {faTime(h.at)}
                </span>
              </li>
            )
          )}
        </ul>
      ) : (
        <p className="fc-card p-4 text-sm text-fc-muted">
          هنوز ورودی ثبت نشده است.
        </p>
      )}

      <div className="h-8" />
    </>
  );
}
