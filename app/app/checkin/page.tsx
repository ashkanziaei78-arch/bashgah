import { notFound } from "next/navigation";
import { Nfc, CreditCard, LogIn, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, getActiveMembership, sessionsLeft, getSetting } from "@/lib/data";
import { faDigits, faDate, faTime, daysUntil } from "@/lib/format";

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
      <header className="pt-5 pb-3.5">
        <h1 className="text-lg">ورود و خروج</h1>
        <p className="text-xs text-fc-dim">
          {membership
            ? `اشتراک ${membership.plans?.name} · تا ${faDate(membership.expires_on)}`
            : "اشتراک فعالی ندارید"}
        </p>
      </header>

      <section className="fc-raised p-7 text-center">
        <div className="relative mx-auto mb-5 grid size-28 place-items-center rounded-full border border-fc-cyan/30 bg-fc-cyan/10 text-fc-cyan">
          <Nfc className="size-10" strokeWidth={1.6} />
        </div>
        <h2 className="mb-2 text-[17px]">
          {card ? "کارت شما فعال است" : "هنوز کارتی برایتان صادر نشده"}
        </h2>
        <p className="mx-auto max-w-[32ch] text-[13px] leading-relaxed text-fc-muted">
          {card
            ? "کارت را روی دستگاه کنار درِ باشگاه بزنید. همان لحظه یک جلسه از اشتراکتان کم می‌شود و اینجا به‌روز می‌شود."
            : "به پذیرش باشگاه مراجعه کنید تا کارت NFC برایتان صادر و به حسابتان وصل شود."}
        </p>
        {card && (
          <p className="fc-chip fc-chip-cy mt-4 inline-flex">
            <CreditCard className="size-3.5" />
            {card.label ?? `کارت ${faDigits(card.uid.slice(-4))}`}
          </p>
        )}
      </section>

      <div className="mt-3.5 grid grid-cols-3 gap-2.5">
        {[
          ["جلسه مانده", left === null ? "∞" : faDigits(left), "var(--color-fc-cyan)"],
          ["روز مانده", faDigits(days), "var(--color-fc-warn)"],
          ["جلسه رفته", faDigits(used), "var(--color-fc-ok)"],
        ].map(([label, value, color]) => (
          <div key={label as string} className="fc-card px-2 py-3 text-center">
            <b
              className="fc-lat fc-num block text-base font-extrabold"
              style={{ color: color as string }}
            >
              {value as string}
            </b>
            <small className="text-[10.5px] text-fc-dim">{label as string}</small>
          </div>
        ))}
      </div>

      <h2 className="mt-6 mb-3 text-[14.5px]">تاریخچه</h2>
      {history && history.length > 0 ? (
        <ul className="fc-card list-none px-4 py-1">
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
                    <LogIn className="size-4" />
                  ) : (
                    <LogOut className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <b className="block text-[13px]">{h.kind === "in" ? "ورود" : "خروج"}</b>
                  <small className="block text-[11.5px] text-fc-dim">
                    {faDate(h.at)}
                    {h.deducted ? " · یک جلسه کم شد" : ""}
                  </small>
                </div>
                <span className="fc-lat fc-num shrink-0 text-xs font-bold text-fc-muted">
                  {faTime(h.at)}
                </span>
              </li>
            )
          )}
        </ul>
      ) : (
        <p className="fc-card p-4 text-[13px] text-fc-muted">
          هنوز ورودی ثبت نشده است.
        </p>
      )}

      <div className="h-6" />
    </>
  );
}
