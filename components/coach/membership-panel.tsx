"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  Check,
  Loader2,
  Minus,
  Pause,
  Play,
  Plus,
  Snowflake,
} from "lucide-react";
import {
  startMembership,
  adjustSessions,
  freezeMembership,
  thawMembership,
} from "@/app/coach/actions";
import type { FreezeInfo } from "@/lib/data";
import { faDigits, faDate, faToman, daysUntil, todayInTehran } from "@/lib/format";

function daysSince(day: string): number {
  const ms = Date.parse(`${todayInTehran()}T12:00:00Z`) - Date.parse(`${day}T12:00:00Z`);
  return Math.max(0, Math.round(ms / 86_400_000));
}

export interface PlanOption {
  id: string;
  name: string;
  priceToman: number;
  durationDays: number;
  sessionsTotal: number | null;
}

export interface CurrentMembership {
  id: string;
  planName: string;
  startedOn: string;
  expiresOn: string;
  sessionsTotal: number | null;
  sessionsUsed: number;
  status: "active" | "expired" | "frozen";
}

const STATUS_LABEL = {
  active: "فعال",
  frozen: "متوقف",
  expired: "منقضی",
} as const;

export function MembershipPanel({
  studentId,
  current,
  plans,
  freeze = null,
}: {
  studentId: string;
  current: CurrentMembership | null;
  plans: PlanOption[];
  freeze?: FreezeInfo | null;
}) {
  const [freezing, setFreezing] = useState(false);
  const [reason, setReason] = useState("");
  const [selling, setSelling] = useState(false);
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [startedOn, setStartedOn] = useState(todayInTehran());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.message ?? "انجام نشد.");
        return;
      }
      setSelling(false);
      setFreezing(false);
      setReason("");
      router.refresh();
    });
  }

  const left =
    current && current.sessionsTotal !== null
      ? Math.max(0, current.sessionsTotal - current.sessionsUsed)
      : null;

  return (
    <section className="fc-card p-4">
      <h2 className="mb-3 flex items-center gap-2 text-[14.5px]">
        اشتراک
        {current && (
          <span
            className={`fc-chip ms-auto ${
              current.status === "active"
                ? "fc-chip-ok"
                : current.status === "frozen"
                  ? "fc-chip-warn"
                  : ""
            }`}
          >
            {STATUS_LABEL[current.status]}
          </span>
        )}
      </h2>

      {current ? (
        <>
          <dl className="grid gap-2 rounded-xl border border-[var(--fc-line2)] bg-fc-ink p-3.5">
            <div className="flex items-baseline justify-between text-[13px]">
              <dt className="text-fc-muted">پلن</dt>
              <dd className="font-extrabold">{current.planName}</dd>
            </div>
            <div className="flex items-baseline justify-between text-[13px]">
              <dt className="text-fc-muted">از</dt>
              <dd className="font-extrabold">{faDate(current.startedOn)}</dd>
            </div>
            <div className="flex items-baseline justify-between text-[13px]">
              <dt className="text-fc-muted">تا</dt>
              <dd className="font-extrabold">
                {faDate(current.expiresOn)}
                <span className="ms-1.5 text-[11.5px] font-normal text-fc-muted">
                  ({faDigits(daysUntil(current.expiresOn))} روز)
                </span>
              </dd>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <dt className="text-fc-muted">جلسات</dt>
              <dd className="flex items-center gap-1.5">
                {left === null ? (
                  <b className="font-extrabold">نامحدود</b>
                ) : (
                  <>
                    {/* The door can double-count; staff fix it here
                        rather than waiting for an admin. */}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => adjustSessions(current.id, studentId, 1))}
                      aria-label="یک جلسه کم کن"
                      className="grid size-7 place-items-center rounded-lg border border-[var(--fc-line2)] text-fc-muted transition-colors hover:text-fc-bad"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <b className="fc-num min-w-14 text-center font-extrabold">
                      {faDigits(left)} از {faDigits(current.sessionsTotal!)}
                    </b>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => adjustSessions(current.id, studentId, -1))}
                      aria-label="یک جلسه برگردان"
                      className="grid size-7 place-items-center rounded-lg border border-[var(--fc-line2)] text-fc-muted transition-colors hover:text-fc-ok"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </>
                )}
              </dd>
            </div>
          </dl>

          {current.status === "frozen" && freeze?.openSince && (() => {
            // Mirrors thaw_membership(): days since the freeze began,
            // capped by what is left of the gym's ceiling.
            const since = daysSince(freeze.openSince);
            const credit = Math.min(since, Math.max(0, freeze.maxDays - freeze.creditedDays));
            return (
              <p className="mt-3 flex items-start gap-2 rounded-xl border border-fc-warn/35 bg-fc-warn/8 p-3 text-[12.5px] leading-6">
                <Snowflake className="mt-1 size-4 shrink-0 text-fc-warn" />
                <span>
                  از {faDate(freeze.openSince)} متوقف است ({faDigits(since)} روز)
                  {freeze.reason ? `، ${freeze.reason}` : ""}. با ادامه،{" "}
                  <b className="text-fc-warn">{faDigits(credit)} روز</b> به تاریخ پایان اضافه می‌شود.
                </span>
              </p>
            );
          })()}

          <div className="mt-3 flex flex-wrap gap-2">
            {current.status === "frozen" && (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => thawMembership(current.id, studentId))}
                className="fc-btn fc-btn-ghost"
                style={{ minHeight: 40, padding: "9px 16px", fontSize: 13 }}
              >
                <Play className="size-4" />
                ادامه‌ی اشتراک
              </button>
            )}
            {current.status === "active" && !freezing && (
              <button
                type="button"
                disabled={pending}
                onClick={() => setFreezing(true)}
                className="fc-btn fc-btn-ghost"
                style={{ minHeight: 40, padding: "9px 16px", fontSize: 13 }}
              >
                <Pause className="size-4" />
                توقف موقت
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelling((v) => !v)}
              className="fc-btn fc-btn-ghost"
              style={{ minHeight: 40, padding: "9px 16px", fontSize: 13 }}
            >
              <CalendarPlus className="size-4" />
              تمدید یا تغییر پلن
            </button>
          </div>
          {freezing && (
            <div className="mt-3 grid gap-2.5 border-t border-[var(--fc-line)] pt-3">
              <label htmlFor="fz-reason" className="text-[12.5px] text-fc-muted">
                دلیل توقف (اختیاری)
              </label>
              <input
                id="fz-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="سفر، آسیب‌دیدگی…"
                maxLength={200}
                className="fc-input"
              />
              <p className="text-[11.5px] text-fc-muted">
                روزهای توقف هنگام ادامه به تاریخ پایان اضافه می‌شود؛ حداکثر{" "}
                {faDigits(freeze?.maxDays ?? 60)} روز برای هر اشتراک
                {freeze && freeze.creditedDays > 0 ? ` (${faDigits(freeze.creditedDays)} روز قبلاً استفاده شده)` : ""}.
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => freezeMembership(current.id, studentId, reason))}
                  className="fc-btn flex-1"
                >
                  {pending ? <Loader2 className="size-[18px] animate-spin" /> : <Snowflake className="size-[18px]" />}
                  متوقف شود
                </button>
                <button type="button" onClick={() => setFreezing(false)} className="fc-btn fc-btn-ghost shrink-0">
                  انصراف
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        !selling && (
          <>
            <p className="mb-3 text-[13px] text-fc-muted">
              اشتراک فعالی ندارد. تا وقتی اشتراک نگیرد، جلسات و روزهای
              باقی‌مانده در اپش خالی است.
            </p>
            <button type="button" onClick={() => setSelling(true)} className="fc-btn w-full">
              <CalendarPlus className="size-[18px]" />
              ثبت اشتراک
            </button>
          </>
        )
      )}

      {selling && (
        <div className="mt-3 grid gap-3 border-t border-[var(--fc-line)] pt-3">
          <div>
            <label htmlFor="ms-plan" className="mb-1.5 block text-[12.5px] text-fc-muted">
              پلن
            </label>
            <select
              id="ms-plan"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="fc-input"
              style={{ fontSize: 16 }}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {faToman(p.priceToman)} ·{" "}
                  {p.sessionsTotal === null
                    ? "نامحدود"
                    : `${p.sessionsTotal} جلسه`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ms-start" className="mb-1.5 block text-[12.5px] text-fc-muted">
              تاریخ شروع
            </label>
            <input
              id="ms-start"
              type="date"
              value={startedOn}
              onChange={(e) => setStartedOn(e.target.value)}
              className="fc-input fc-lat"
              style={{ fontSize: 16 }}
            />
            <p className="mt-1.5 text-[11.5px] text-fc-muted">
              تاریخ پایان از روی مدت همین پلن حساب می‌شود. اگر اشتراک فعالی
              داشته باشد، منقضی می‌شود و این جایش را می‌گیرد.
            </p>
          </div>

          <div className="flex gap-2.5">
            <button
              type="button"
              disabled={pending || !planId}
              onClick={() => run(() => startMembership(studentId, planId, startedOn))}
              className="fc-btn flex-1"
            >
              {pending ? (
                <Loader2 className="size-[18px] animate-spin" />
              ) : (
                <Check className="size-[18px]" />
              )}
              ثبت
            </button>
            <button
              type="button"
              onClick={() => setSelling(false)}
              className="fc-btn fc-btn-ghost shrink-0"
            >
              انصراف
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2.5 text-[12.5px] text-fc-bad">
          {error}
        </p>
      )}
    </section>
  );
}
