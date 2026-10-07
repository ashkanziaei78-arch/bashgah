"use client";

import { useState, useTransition } from "react";
import { Loader2, Phone, UserPlus, Trash2, CalendarClock, MessageSquareText } from "lucide-react";
import { addLead, updateLead, deleteLead } from "@/app/admin/engage-actions";
import {
  LEAD_SOURCE, LEAD_SOURCES, LEAD_STATUS, LEAD_STATUSES, followUp,
  type LeadSource, type LeadStatus,
} from "@/lib/leads";
import { faDate, faDigits, todayInTehran } from "@/lib/format";

function addDays(day: string, n: number) {
  return new Date(Date.parse(`${day}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}
const FOLLOW = [
  { n: 0, label: "امروز" },
  { n: 1, label: "فردا" },
  { n: 3, label: "۳ روز دیگر" },
  { n: 7, label: "هفته‌ی بعد" },
];

export function LeadForm() {
  const today = todayInTehran();
  const [fullName, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState<LeadSource>("walk_in");
  const [interest, setInterest] = useState("");
  const [note, setNote] = useState("");
  const [follow, setFollow] = useState<number | null>(1);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const r = await addLead({
        fullName, phone, source, interest, note,
        followUpOn: follow === null ? null : addDays(today, follow),
      });
      if (r.ok) {
        setName(""); setPhone(""); setInterest(""); setNote("");
        setMsg({ ok: true, text: "ثبت شد." });
      } else setMsg({ ok: false, text: r.message ?? "ثبت نشد." });
    });
  }

  return (
    <form onSubmit={submit} className="fc-raised grid gap-3.5 p-5">
      <h2 className="flex items-center gap-2 text-[15px]">
        <UserPlus className="size-5 text-fc-cyan" />
        مراجعه‌کننده‌ی تازه
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
          نام
          <input className="fc-input" value={fullName} onChange={(e) => setName(e.target.value)} required maxLength={80} />
        </label>
        <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
          شماره تماس
          <input className="fc-input fc-num" dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0912…" />
        </label>
        <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
          از کجا آمده
          <select className="fc-input" value={source} onChange={(e) => setSource(e.target.value as LeadSource)}>
            {LEAD_SOURCES.map((s) => <option key={s} value={s}>{LEAD_SOURCE[s]}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
          دنبال چیست
          <input className="fc-input" value={interest} onChange={(e) => setInterest(e.target.value)} maxLength={120} placeholder="کاهش وزن، پلن ۳ ماهه…" />
        </label>
      </div>
      <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
        یادداشت
        <textarea className="fc-input min-h-16" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
      </label>
      <fieldset>
        <legend className="mb-1.5 text-[12.5px] text-fc-muted">پیگیری</legend>
        <div className="flex flex-wrap gap-2">
          {FOLLOW.map((f) => (
            <button key={f.n} type="button" aria-pressed={follow === f.n} onClick={() => setFollow(f.n)}
              className={`rounded-full border px-3.5 py-2 text-[12px] font-bold ${follow === f.n ? "border-fc-cyan bg-fc-cyan/12 text-fc-cyan" : "border-[var(--fc-line2)] text-fc-muted"}`}>
              {f.label}
            </button>
          ))}
          <button type="button" aria-pressed={follow === null} onClick={() => setFollow(null)}
            className={`rounded-full border px-3.5 py-2 text-[12px] font-bold ${follow === null ? "border-fc-cyan bg-fc-cyan/12 text-fc-cyan" : "border-[var(--fc-line2)] text-fc-muted"}`}>
            بدون پیگیری
          </button>
        </div>
      </fieldset>
      <button type="submit" disabled={pending} className="fc-btn">
        {pending ? <Loader2 className="size-[18px] animate-spin" /> : <UserPlus className="size-[18px]" />}
        ثبت
      </button>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-center text-[12.5px] ${msg.ok ? "text-fc-ok" : "text-fc-bad"}`}>{msg.text}</p>}
    </form>
  );
}

export interface LeadRow {
  id: string;
  full_name: string;
  phone: string | null;
  source: LeadSource;
  interest: string | null;
  status: LeadStatus;
  note: string | null;
  follow_up_on: string | null;
  created_at: string;
}

const STATUS_TONE: Record<LeadStatus, string> = {
  new: "fc-chip-cy",
  contacted: "",
  trial: "fc-chip-warn",
  won: "fc-chip-ok",
  lost: "fc-chip-bad",
};

export function LeadCard({ lead }: { lead: LeadRow }) {
  const today = todayInTehran();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const f = followUp(lead.follow_up_on, today);
  const open = lead.status !== "won" && lead.status !== "lost";

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.message ?? "انجام نشد.");
    });
  }

  return (
    <article className={`fc-card grid gap-3 p-4 ${open ? "" : "opacity-75"}`}>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full text-[14px] font-black text-white" style={{ background: "var(--fc-grad)" }}>
          {lead.full_name.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14.5px]">{lead.full_name}</h3>
          <p className="flex flex-wrap gap-x-2.5 text-[11.5px] text-fc-muted">
            <span>{LEAD_SOURCE[lead.source]}</span>
            <span>{faDate(lead.created_at)}</span>
            {lead.interest && <span>{lead.interest}</span>}
          </p>
        </div>
        <span className={`fc-chip ${STATUS_TONE[lead.status]}`}>{LEAD_STATUS[lead.status]}</span>
      </div>

      {lead.note && (
        <p className="flex gap-2 text-[12.5px] leading-6 text-fc-muted">
          <MessageSquareText className="mt-1 size-3.5 shrink-0" />
          {lead.note}
        </p>
      )}

      {open && f && (
        <p className={`flex items-center gap-1.5 text-[12px] font-bold ${f === "overdue" ? "text-fc-bad" : f === "today" ? "text-fc-warn" : "text-fc-muted"}`}>
          <CalendarClock className="size-4" />
          {f === "overdue" ? `پیگیری عقب افتاده (${faDate(lead.follow_up_on!)})` : f === "today" ? "امروز باید تماس بگیرید" : `پیگیری ${faDate(lead.follow_up_on!)}`}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {lead.phone && (
          <a href={`tel:${lead.phone}`} className="fc-btn min-h-10 px-4 text-[13px]">
            <Phone className="size-4" />
            <span className="fc-num" dir="ltr">{faDigits(lead.phone)}</span>
          </a>
        )}
        <select
          aria-label="وضعیت"
          className="fc-input min-h-10 w-auto flex-1 py-2"
          value={lead.status}
          disabled={pending}
          onChange={(e) => run(() => updateLead(lead.id, { status: e.target.value as LeadStatus }))}
        >
          {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS[s]}</option>)}
        </select>
        {open && (
          <select
            aria-label="پیگیری بعدی"
            className="fc-input min-h-10 w-auto py-2"
            value=""
            disabled={pending}
            onChange={(e) => e.target.value && run(() => updateLead(lead.id, { followUpOn: addDays(today, Number(e.target.value)) }))}
          >
            <option value="">پیگیری بعدی…</option>
            {FOLLOW.map((x) => <option key={x.n} value={x.n}>{x.label}</option>)}
          </select>
        )}
        <button type="button" disabled={pending} onClick={() => run(() => deleteLead(lead.id))} aria-label="حذف"
          className="grid size-10 place-items-center rounded-lg border border-[var(--fc-line2)] text-fc-muted hover:text-fc-bad">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        </button>
      </div>
      {error && <p role="alert" className="text-[12px] text-fc-bad">{error}</p>}
    </article>
  );
}
