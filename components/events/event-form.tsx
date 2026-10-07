"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trophy, PartyPopper, X } from "lucide-react";
import { createEvent } from "@/app/admin/events/actions";
import { EventIcon } from "@/components/events/event-icon";
import {
  EVENT_KIND_LABEL, EVENT_KINDS, SCORE_KINDS, SCORE_LABEL, defaultLowerIsBetter,
  type EventKind, type ScoreKind,
} from "@/lib/events";
import { faDate, faDigits, todayInTehran } from "@/lib/format";

const TIMES = Array.from({ length: 35 }, (_, i) => {
  const m = 6 * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});
const PRESETS = ["RX", "Scaled", "آقایان", "بانوان", "مبتدی", "پیشرفته"];

export function EventForm() {
  const router = useRouter();
  const days = useMemo(() => {
    const base = new Date(`${todayInTehran()}T12:00:00Z`);
    return Array.from({ length: 45 }, (_, i) => {
      const iso = new Date(base.getTime() + i * 86_400_000).toISOString().slice(0, 10);
      return { iso, label: i === 0 ? "امروز" : i === 1 ? "فردا" : faDate(iso) };
    });
  }, []);

  const [competition, setCompetition] = useState(true);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<EventKind>("crossfit");
  const [day, setDay] = useState(days[7].iso);
  const [time, setTime] = useState("09:00");
  const [hours, setHours] = useState(3);
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState<number | "">("");
  const [fee, setFee] = useState<number | "">("");
  const [close, setClose] = useState<number | null>(24);
  const [divisions, setDivisions] = useState<string[]>(["RX", "Scaled"]);
  const [divInput, setDivInput] = useState("");
  const [scoreKind, setScoreKind] = useState<ScoreKind>("time");
  const [lower, setLower] = useState(true);
  const [description, setDescription] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function addDivision(d: string) {
    const v = d.trim();
    if (v && !divisions.includes(v) && divisions.length < 8) setDivisions([...divisions, v]);
    setDivInput("");
  }

  function submit(publish: boolean) {
    setMsg(null);
    start(async () => {
      const r = await createEvent({
        title, kind, isCompetition: competition, day, time, hours, location,
        capacity: capacity === "" ? null : capacity, feeToman: fee === "" ? null : fee,
        closeHoursBefore: close, divisions, scoreKind, lowerIsBetter: lower, description, publish,
      });
      if (r.ok && r.id) router.push(`/admin/events/${r.id}`);
      else setMsg({ ok: false, text: r.message ?? "ثبت نشد." });
    });
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(true); }} className="fc-raised grid gap-4 p-5">
      <h2 className="text-[15px]">رویداد تازه</h2>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" aria-pressed={competition} onClick={() => setCompetition(true)}
          className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-[13px] font-bold ${competition ? "border-fc-warn bg-fc-warn/10 text-fc-warn" : "border-[var(--fc-line)] text-fc-muted"}`}>
          <Trophy className="size-4" />مسابقه (با امتیاز و رتبه)
        </button>
        <button type="button" aria-pressed={!competition} onClick={() => setCompetition(false)}
          className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-[13px] font-bold ${!competition ? "border-fc-cyan bg-fc-cyan/10 text-fc-cyan" : "border-[var(--fc-line)] text-fc-muted"}`}>
          <PartyPopper className="size-4" />رویداد (فقط ثبت‌نام)
        </button>
      </div>

      <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
        عنوان
        <input className="fc-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} required
          placeholder={competition ? "مثلاً مسابقه‌ی کراسفیت پاییزه" : "مثلاً تماشای فوتبال کنار استخر"} />
      </label>

      <fieldset>
        <legend className="mb-1.5 text-[12.5px] text-fc-muted">نوع</legend>
        <div className="grid grid-cols-4 gap-2">
          {EVENT_KINDS.map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}
              className={`grid justify-items-center gap-1.5 rounded-xl border px-1 py-2.5 text-[11.5px] font-bold ${kind === k ? "border-fc-cyan bg-fc-cyan/10 text-fc-text" : "border-[var(--fc-line)] text-fc-muted"}`}>
              <EventIcon kind={k} size={34} />
              {EVENT_KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="min-w-0">
        <p className="mb-2 text-[12.5px] text-fc-muted">روز</p>
        <div className="fc-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {days.map((d) => (
            <button key={d.iso} type="button" onClick={() => setDay(d.iso)} aria-pressed={day === d.iso}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-[12px] font-bold ${day === d.iso ? "border-fc-cyan bg-fc-cyan/12 text-fc-cyan" : "border-[var(--fc-line2)] text-fc-muted"}`}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
          ساعت شروع
          <select className="fc-input" value={time} onChange={(e) => setTime(e.target.value)}>
            {TIMES.map((t) => <option key={t} value={t}>{faDigits(t)}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
          مدت
          <select className="fc-input" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
            {[1, 2, 3, 4, 6, 8, 12].map((h) => <option key={h} value={h}>{faDigits(h)} ساعت</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
          ظرفیت
          <input className="fc-input" type="number" min={1} value={capacity} placeholder="نامحدود" onChange={(e) => setCapacity(e.target.value ? Number(e.target.value) : "")} />
        </label>
        <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
          هزینه (تومان)
          <input className="fc-input" type="number" min={0} step={10000} value={fee} placeholder="رایگان" onChange={(e) => setFee(e.target.value ? Number(e.target.value) : "")} />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
          محل
          <input className="fc-input" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={60} placeholder="سالن اصلی، استخر…" />
        </label>
        <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
          پایان ثبت‌نام
          <select className="fc-input" value={close ?? ""} onChange={(e) => setClose(e.target.value ? Number(e.target.value) : null)}>
            <option value="">تا شروع رویداد</option>
            <option value={24}>یک روز قبل</option>
            <option value={48}>دو روز قبل</option>
            <option value={168}>یک هفته قبل</option>
          </select>
        </label>
      </div>

      {competition && (
        <>
          <div className="grid gap-2">
            <span className="text-[12.5px] text-fc-muted">رده‌ها (اختیاری)</span>
            <div className="flex flex-wrap gap-1.5">
              {divisions.map((d) => (
                <button key={d} type="button" onClick={() => setDivisions(divisions.filter((x) => x !== d))} className="fc-chip fc-chip-cy">
                  {d}<X className="size-3" />
                </button>
              ))}
              {PRESETS.filter((p) => !divisions.includes(p)).map((p) => (
                <button key={p} type="button" onClick={() => addDivision(p)} className="fc-chip">+ {p}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="fc-input flex-1" value={divInput} onChange={(e) => setDivInput(e.target.value)} placeholder="رده‌ی دلخواه" maxLength={24}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDivision(divInput); } }} />
              <button type="button" onClick={() => addDivision(divInput)} className="fc-btn fc-btn-ghost shrink-0">افزودن</button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
              امتیاز بر اساس
              <select className="fc-input" value={scoreKind} onChange={(e) => { const k = e.target.value as ScoreKind; setScoreKind(k); setLower(defaultLowerIsBetter(k)); }}>
                {SCORE_KINDS.map((k) => <option key={k} value={k}>{SCORE_LABEL[k]}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
              برنده
              <select className="fc-input" value={lower ? "low" : "high"} onChange={(e) => setLower(e.target.value === "low")}>
                <option value="low">کمترین عدد (مثلاً زمان)</option>
                <option value="high">بیشترین عدد (تکرار، وزنه، امتیاز)</option>
              </select>
            </label>
          </div>
        </>
      )}

      <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
        توضیحات
        <textarea className="fc-input min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000}
          placeholder="حرکت‌ها، قوانین، جایزه‌ها…" />
      </label>

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="fc-btn flex-1">
          {pending ? <Loader2 className="size-[18px] animate-spin" /> : <Trophy className="size-[18px]" />}
          انتشار برای اعضا
        </button>
        <button type="button" disabled={pending} onClick={() => submit(false)} className="fc-btn fc-btn-ghost">پیش‌نویس</button>
      </div>
      {msg && <p role="alert" className="text-center text-[12.5px] text-fc-bad">{msg.text}</p>}
    </form>
  );
}
