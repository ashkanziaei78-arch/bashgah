"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarPlus, Loader2, Repeat } from "lucide-react";
import { createClasses } from "@/app/coach/classes/actions";
import { KindIcon } from "@/components/classes/kind-icon";
import { KIND_LABEL, KINDS, type ClassKind } from "@/lib/classes";
import { faDate, faDigits, todayInTehran } from "@/lib/format";

const TIMES = Array.from({ length: 33 }, (_, i) => {
  const m = 6 * 60 + i * 30; // 06:00 → 22:00
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});
const DURATIONS = [30, 45, 60, 75, 90, 120];

export function ClassForm({ coaches }: { coaches: { id: string; full_name: string }[] }) {
  const days = useMemo(() => {
    const base = new Date(`${todayInTehran()}T12:00:00Z`);
    return Array.from({ length: 21 }, (_, i) => {
      const iso = new Date(base.getTime() + i * 86_400_000).toISOString().slice(0, 10);
      return { iso, label: i === 0 ? "امروز" : i === 1 ? "فردا" : faDate(iso) };
    });
  }, []);

  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ClassKind>("hiit");
  const [day, setDay] = useState(days[1].iso);
  const [time, setTime] = useState("18:00");
  const [duration, setDuration] = useState(60);
  const [capacity, setCapacity] = useState(12);
  const [coachId, setCoachId] = useState(coaches[0]?.id ?? "");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [weeks, setWeeks] = useState(1);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    start(async () => {
      const r = await createClasses({
        title, kind, day, time, durationMin: duration, capacity,
        coachId: coachId || null, location, description, repeatWeeks: weeks,
      });
      if (r.ok) {
        setResult({ ok: true, text: r.created && r.created > 1 ? `${faDigits(r.created)} جلسه به برنامه اضافه شد.` : "کلاس به برنامه اضافه شد." });
        setTitle("");
        setDescription("");
      } else {
        setResult({ ok: false, text: r.message ?? "ثبت نشد." });
      }
    });
  }

  return (
    <form onSubmit={submit} className="fc-raised grid gap-4 p-5">
      <h2 className="flex items-center gap-2 text-[15px]">
        <CalendarPlus className="size-5 text-fc-cyan" />
        کلاس تازه
      </h2>

      <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
        نام کلاس
        <input className="fc-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً HIIT صبحگاهی" maxLength={60} required />
      </label>

      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-[12.5px] text-fc-muted">نوع</legend>
        <div className="grid grid-cols-4 gap-2">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={`grid justify-items-center gap-1.5 rounded-xl border px-1 py-2.5 text-[11.5px] font-bold transition-colors ${
                kind === k ? "border-fc-cyan bg-fc-cyan/10 text-fc-text" : "border-[var(--fc-line)] text-fc-muted hover:text-fc-text"
              }`}
            >
              <KindIcon kind={k} size={34} />
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </fieldset>

      {/* min-w-0: a grid item defaults to min-width:auto, so without it
          the scrolling chip row would widen the whole form instead of
          scrolling inside it. */}
      <div className="min-w-0">
        <p className="mb-2 text-[12.5px] text-fc-muted">روز</p>
        <div className="fc-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {days.map((d) => (
            <button
              key={d.iso}
              type="button"
              onClick={() => setDay(d.iso)}
              aria-pressed={day === d.iso}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-[12px] font-bold transition-colors ${
                day === d.iso ? "border-fc-cyan bg-fc-cyan/12 text-fc-cyan" : "border-[var(--fc-line2)] text-fc-muted hover:text-fc-text"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
          ساعت
          <select className="fc-input fc-num" value={time} onChange={(e) => setTime(e.target.value)}>
            {TIMES.map((t) => <option key={t} value={t}>{faDigits(t)}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
          مدت
          <select className="fc-input" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {DURATIONS.map((d) => <option key={d} value={d}>{faDigits(d)} دقیقه</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
          ظرفیت
          <input className="fc-input fc-num" type="number" inputMode="numeric" min={1} max={200} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
        </label>
        <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
          <span className="inline-flex items-center gap-1"><Repeat className="size-3.5" />تکرار هفتگی</span>
          <select className="fc-input" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>{w === 1 ? "فقط همین" : `${faDigits(w)} هفته`}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
          مربی
          <select className="fc-input" value={coachId} onChange={(e) => setCoachId(e.target.value)}>
            <option value="">بدون مربی</option>
            {coaches.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
          محل
          <input className="fc-input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="سالن ۲" maxLength={40} />
        </label>
      </div>

      <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
        توضیح کوتاه (اختیاری)
        <textarea className="fc-input min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={240} />
      </label>

      <button type="submit" disabled={pending} className="fc-btn">
        {pending ? <Loader2 className="size-[18px] animate-spin" /> : <CalendarPlus className="size-[18px]" />}
        {weeks > 1 ? `ثبت ${faDigits(weeks)} جلسه` : "ثبت کلاس"}
      </button>
      {result && (
        <p role={result.ok ? "status" : "alert"} className={`text-center text-[12.5px] ${result.ok ? "text-fc-ok" : "text-fc-bad"}`}>
          {result.text}
        </p>
      )}
    </form>
  );
}
