"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X, Timer } from "lucide-react";
import { faDigits } from "@/lib/format";

/** Counts down the rest a coach wrote for an exercise, starting the
 *  moment its set is logged.
 *
 *  `rest_seconds` has been in the schema and seeded with real values
 *  since the first migration, and nothing ever showed it. Resting the
 *  written interval is most of what separates a programme from a list
 *  of movements, and nobody counts it in their head.
 *
 *  The deadline is kept as a timestamp rather than a decrementing
 *  counter: a phone that sleeps or a tab that is backgrounded throttles
 *  intervals, so a counter would drift and under-rest the member. */
export function RestTimer({
  seconds,
  exercise,
  onDone,
}: {
  seconds: number;
  exercise: string;
  onDone: () => void;
}) {
  // There is no reset effect here on purpose. The caller keys this
  // component on the moment rest started, so logging another set
  // remounts it with a fresh clock — which is both simpler and safer
  // than mirroring props into state.
  const [endsAt, setEndsAt] = useState(() => Date.now() + seconds * 1000);
  const [left, setLeft] = useState(seconds);
  const fired = useRef(false);

  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
      setLeft(remaining);

      if (remaining === 0 && !fired.current) {
        fired.current = true;
        // A phone in a pocket under a squat rack is not being watched.
        navigator.vibrate?.([120, 60, 120]);
      }
    };

    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  const done = left === 0;
  // Adding time fills the bar rather than overflowing it.
  const ratio = seconds > 0 ? Math.min(1, left / seconds) : 0;
  const mm = String(Math.floor(left / 60));
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="fc-rest" role="group" aria-label="زمان استراحت">
      {/* Two rows rather than one. Packed onto a single line the label
          was squeezed to 79px on a 390px phone — the exercise name, the
          one thing that says which rest this is, had nowhere to go. */}
      <div className="fc-rest-head">
        <Timer className="size-4 shrink-0 text-fc-muted" aria-hidden />
        <b className="shrink-0 text-sm">
          {done ? "استراحت تمام شد" : "استراحت"}
        </b>
        <small className="truncate text-xs text-fc-muted">· {exercise}</small>
      </div>

      <div className="fc-rest-body">
        {/* The count is polite rather than assertive: a screen reader
            announcing every tick would make the screen unusable. */}
        <b
          className="fc-num shrink-0 text-2xl"
          style={{ color: done ? "var(--color-fc-ok)" : "var(--color-fc-text)" }}
          role="timer"
          aria-live="off"
        >
          {faDigits(`${mm}:${ss}`)}
        </b>

        <div className="fc-bar min-w-0 flex-1" aria-hidden>
          <i
            style={{
              width: `${ratio * 100}%`,
              background: done ? "var(--color-fc-ok)" : undefined,
              transition: "none",
            }}
          />
        </div>

        <button
          type="button"
          onClick={() => setEndsAt((t) => Math.max(Date.now(), t) + 15_000)}
          className="fc-rest-btn"
          aria-label="پانزده ثانیه بیشتر"
        >
          <Plus className="size-4" aria-hidden />
          <span className="fc-num text-xs">۱۵</span>
        </button>

        <button
          type="button"
          onClick={onDone}
          className="fc-rest-btn"
          aria-label={done ? "بستن" : "رد کردن استراحت"}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
