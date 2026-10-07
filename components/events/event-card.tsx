"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CalendarDays, MapPin, Users, Ticket, Trophy, Loader2, CircleCheck, ChevronLeft } from "lucide-react";
import { EventIcon } from "@/components/events/event-icon";
import { registerEvent, cancelEventRegistration } from "@/app/app/events/actions";
import { EVENT_KIND_LABEL, eventAction, type ListedEvent } from "@/lib/events";
import { tehranClock } from "@/lib/classes";
import { faDayParts, faDigits, faToman } from "@/lib/format";

const CLOSED: Record<string, string> = {
  cancelled: "این رویداد لغو شد",
  finished: "برگزار شد",
  started: "شروع شده",
  deadline: "مهلت ثبت‌نام تمام شد",
  full: "ظرفیت تکمیل است",
};

export function EventCard({ e, nowIso }: { e: ListedEvent; nowIso: string }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [division, setDivision] = useState(e.my_division ?? e.divisions[0] ?? "");
  const action = eventAction(e, new Date(nowIso));
  const p = faDayParts(e.starts_at);

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    setMessage(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setMessage(r.message ?? "انجام نشد.");
    });
  }

  return (
    <article className={`fc-card overflow-hidden ${e.status === "cancelled" ? "opacity-70" : ""}`}>
      <div className="flex items-start gap-3.5 p-4">
        <EventIcon kind={e.kind} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`fc-chip ${e.is_competition ? "fc-chip-warn" : "fc-chip-cy"}`}>
              {e.is_competition ? <Trophy className="size-3.5" /> : null}
              {e.is_competition ? "مسابقه" : "رویداد"}
            </span>
            <span className="text-[11.5px] text-fc-muted">{EVENT_KIND_LABEL[e.kind]}</span>
          </div>
          <h3 className="mt-1.5 text-[16px] leading-snug">{e.title}</h3>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-fc-muted">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" />
              {p.weekday} {p.day} {p.month}، ساعت {faDigits(tehranClock(e.starts_at))}
            </span>
            {e.location && (
              <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{e.location}</span>
            )}
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" />
              {faDigits(e.registered)}{e.capacity ? ` از ${faDigits(e.capacity)}` : ""} نفر
            </span>
            {e.fee_toman ? (
              <span className="inline-flex items-center gap-1"><Ticket className="size-3.5" />{faToman(e.fee_toman)}</span>
            ) : null}
          </p>
        </div>
      </div>

      {e.description && <p className="px-4 pb-3 text-[12.5px] leading-6 whitespace-pre-line text-fc-muted">{e.description}</p>}

      <div className="grid gap-2 border-t border-[var(--fc-line)] p-4">
        {action.kind === "register" && (
          <div className="flex gap-2">
            {e.divisions.length > 0 && (
              <select className="fc-input w-auto flex-1" value={division} onChange={(ev) => setDivision(ev.target.value)} aria-label="رده">
                {e.divisions.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
            <button type="button" disabled={pending} onClick={() => run(() => registerEvent(e.id, division || null))} className="fc-btn flex-1">
              {pending ? <Loader2 className="size-[18px] animate-spin" /> : <Ticket className="size-[18px]" />}
              ثبت‌نام
            </button>
          </div>
        )}
        {action.kind === "registered" && (
          <div className="flex items-center gap-2">
            <span className="fc-chip fc-chip-ok"><CircleCheck className="size-3.5" />ثبت‌نام کردید{e.my_division ? `، ${e.my_division}` : ""}</span>
            <button type="button" disabled={pending} onClick={() => run(() => cancelEventRegistration(e.id))} className="fc-btn fc-btn-ghost ms-auto min-h-10 px-4 text-[13px]">
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              انصراف
            </button>
          </div>
        )}
        {action.kind === "closed" && (
          <p className="text-center text-[12.5px] text-fc-muted">{CLOSED[action.reason]}</p>
        )}
        {e.is_competition && (e.results > 0 || e.status === "finished") && (
          <Link href={`/app/events/${e.id}`} className="flex items-center justify-center gap-1.5 text-[13px] font-bold text-fc-cyan">
            <Trophy className="size-4" />
            جدول نتایج
            <ChevronLeft className="size-4" />
          </Link>
        )}
        {message && <p role="alert" className="text-center text-[12.5px] text-fc-bad">{message}</p>}
      </div>
    </article>
  );
}
