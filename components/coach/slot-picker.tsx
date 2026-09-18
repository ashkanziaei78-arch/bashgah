"use client";

import { useMemo, useState } from "react";
import { faDate, faDigits, todayInTehran } from "@/lib/format";

/** Iran has not observed daylight saving since 2022, so Tehran is a flat
 *  UTC+03:30. Writing the offset into the timestamp keeps the booking at
 *  the hour the coach picked no matter where the app is deployed. */
const TEHRAN_OFFSET = "+03:30";

const HOURS = Array.from({ length: 29 }, (_, i) => {
  const minutes = 8 * 60 + i * 30; // 08:00 → 22:00, every half hour
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
});

/** A native datetime-local would show a Gregorian calendar to a coach who
 *  schedules in Jalali, so the days are offered as labelled chips instead
 *  and only the resulting timestamp is Gregorian. */
export function SlotPicker({
  onPick,
  busy,
}: {
  onPick: (isoTimestamp: string) => void;
  busy: boolean;
}) {
  const days = useMemo(() => {
    // Midday UTC keeps the calendar date stable when +03:30 is applied.
    const base = new Date(`${todayInTehran()}T12:00:00Z`);
    return Array.from({ length: 14 }, (_, i) => {
      const date = new Date(base.getTime() + i * 86_400_000);
      const iso = date.toISOString().slice(0, 10);
      return {
        iso,
        label: i === 0 ? "امروز" : i === 1 ? "فردا" : faDate(iso),
      };
    });
  }, []);

  const [day, setDay] = useState(days[0].iso);
  const [time, setTime] = useState("18:00");

  return (
    <div className="mt-3 border-t border-[var(--fc-line)] pt-3">
      <p className="mb-2 text-[12.5px] text-fc-muted">روز جلسه</p>
      <div className="fc-scroll -mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {days.map((d) => (
          <button
            key={d.iso}
            type="button"
            onClick={() => setDay(d.iso)}
            aria-pressed={day === d.iso}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-[12px] font-bold transition-colors ${
              day === d.iso
                ? "border-fc-cyan bg-fc-cyan/12 text-fc-cyan"
                : "border-[var(--fc-line2)] text-fc-muted hover:text-fc-text"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2.5">
        <label htmlFor="slot-time" className="shrink-0 text-[12.5px] text-fc-muted">
          ساعت
        </label>
        <select
          id="slot-time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="fc-input fc-lat flex-1"
          style={{ fontSize: 16 }}
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {faDigits(h)}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={busy}
          onClick={() => onPick(`${day}T${time}:00${TEHRAN_OFFSET}`)}
          className="fc-btn shrink-0"
        >
          ثبت تایم
        </button>
      </div>
    </div>
  );
}
