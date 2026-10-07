"use client";

import { useState, useTransition } from "react";
import { Clock, MapPin, UserRound, Loader2, CircleCheck, Hourglass, Ban } from "lucide-react";
import { KindIcon } from "@/components/classes/kind-icon";
import { SeatBar } from "@/components/classes/seat-bar";
import { bookClass, cancelBooking } from "@/app/app/classes/actions";
import { classAction, endsAt, KIND_LABEL, tehranClock, type ScheduledClass } from "@/lib/classes";
import { faDigits } from "@/lib/format";

const LOCKED: Record<string, string> = {
  cancelled: "این کلاس لغو شد",
  started: "شروع شده",
  too_late: "زمان لغو گذشته",
  too_early: "رزرو هنوز باز نشده",
};

export function ClassCard({
  c,
  nowIso,
  cancelWindowHours,
  horizonDays,
}: {
  c: ScheduledClass;
  nowIso: string;
  cancelWindowHours: number;
  horizonDays: number;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const action = classAction(c, new Date(nowIso), { cancelWindowHours, horizonDays });

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    setMessage(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setMessage(r.message ?? "انجام نشد.");
    });
  }

  const status =
    c.cancelled_at ? (
      <span className="fc-chip fc-chip-bad"><Ban className="size-3.5" />لغو شد</span>
    ) : c.my_status === "booked" ? (
      <span className="fc-chip fc-chip-ok"><CircleCheck className="size-3.5" />رزرو شد</span>
    ) : c.my_status === "waitlisted" ? (
      <span className="fc-chip fc-chip-warn">
        <Hourglass className="size-3.5" />
        صف: نفر {faDigits(c.my_position ?? 0)}
      </span>
    ) : c.my_status === "attended" ? (
      <span className="fc-chip fc-chip-cy"><CircleCheck className="size-3.5" />حاضر بودید</span>
    ) : null;

  return (
    <article
      className={`fc-card p-4 transition-opacity ${c.cancelled_at ? "opacity-70" : ""}`}
      aria-label={`${c.title}، ساعت ${faDigits(tehranClock(c.starts_at))}`}
    >
      <div className="flex items-start gap-3.5">
        <KindIcon kind={c.kind} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15.5px] leading-snug">{c.title}</h3>
            {status}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-fc-muted">
            <span className="fc-num inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {faDigits(tehranClock(c.starts_at))} تا {faDigits(tehranClock(endsAt(c)))}
            </span>
            <span>{KIND_LABEL[c.kind]}</span>
            {c.coach_name && (
              <span className="inline-flex items-center gap-1">
                <UserRound className="size-3.5" />
                {c.coach_name}
              </span>
            )}
            {c.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {c.location}
              </span>
            )}
          </p>
        </div>
      </div>

      {c.description && <p className="mt-3 text-[12.5px] leading-6 text-fc-muted">{c.description}</p>}

      {!c.cancelled_at && (
        <div className="mt-3.5">
          <SeatBar booked={c.booked} capacity={c.capacity} waitlisted={c.waitlisted} />
        </div>
      )}

      <div className="mt-3.5">
        {action.kind === "book" && (
          <button type="button" disabled={pending} onClick={() => run(() => bookClass(c.id))} className="fc-btn w-full">
            {pending ? <Loader2 className="size-[18px] animate-spin" /> : null}
            رزرو جا
          </button>
        )}
        {action.kind === "join_waitlist" && (
          <button type="button" disabled={pending} onClick={() => run(() => bookClass(c.id))} className="fc-btn fc-btn-ghost w-full">
            {pending ? <Loader2 className="size-[18px] animate-spin" /> : <Hourglass className="size-[18px]" />}
            رفتن به صف انتظار
          </button>
        )}
        {(action.kind === "cancel" || action.kind === "leave_waitlist") && (
          <button type="button" disabled={pending} onClick={() => run(() => cancelBooking(c.id))} className="fc-btn fc-btn-ghost w-full">
            {pending ? <Loader2 className="size-[18px] animate-spin" /> : null}
            {action.kind === "cancel" ? "لغو رزرو" : "خروج از صف"}
          </button>
        )}
        {action.kind === "locked" && (
          <p className="rounded-xl border border-[var(--fc-line)] px-3 py-2.5 text-center text-[12.5px] text-fc-muted">
            {LOCKED[action.reason]}
          </p>
        )}
        {action.kind === "cancel" && (
          <p className="mt-2 text-center text-[11.5px] text-fc-muted">
            تا {faDigits(cancelWindowHours)} ساعت مانده به شروع می‌توانید لغو کنید.
          </p>
        )}
        {message && (
          <p role="alert" className="mt-2 text-center text-[12.5px] text-fc-bad">
            {message}
          </p>
        )}
      </div>
    </article>
  );
}
