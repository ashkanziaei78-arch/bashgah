"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Check, Play, Info, X, TrendingUp, TrendingDown, CloudOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { RestTimer } from "@/components/rest-timer";
import { remember, forget, pending, type PendingLog } from "@/lib/pending-logs";
import { faDigits } from "@/lib/format";

export interface ExerciseRow {
  itemId: string;
  name: string;
  sets: number;
  reps: number;
  instructions: string | null;
  hasVideo: boolean;
  /** Seconds the coach wrote between sets. */
  rest: number;
  weight: number | null;
  done: boolean;
  previous: number | null;
}

/** The one number a lifter comes back for: how much more than last time.
 *  Shown as a delta rather than a passive "previous: 57.5" label, because
 *  beating the last session is the whole point of writing it down. */
function WeightDelta({
  previous,
  current,
}: {
  previous: number | null;
  current: number | null;
}) {
  if (previous === null) {
    return (
      <em className="ms-auto text-xs not-italic text-fc-dim">اولین جلسه</em>
    );
  }

  if (current === null) {
    return (
      <em className="ms-auto text-xs not-italic text-fc-muted">
        قبلی <span className="fc-num">{faDigits(previous)}</span>
      </em>
    );
  }

  const delta = Math.round((current - previous) * 10) / 10;

  if (delta === 0) {
    return (
      <em className="ms-auto text-xs not-italic text-fc-muted">مثل جلسه قبل</em>
    );
  }

  const up = delta > 0;
  return (
    <em
      className={`ms-auto inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold not-italic ${
        up ? "bg-fc-ok/12 text-fc-ok" : "bg-[var(--fc-track)] text-fc-muted"
      }`}
    >
      {up ? (
        <TrendingUp className="size-3.5" aria-hidden />
      ) : (
        <TrendingDown className="size-3.5" aria-hidden />
      )}
      <span className="fc-num">{faDigits(Math.abs(delta))}</span> کیلو
    </em>
  );
}

export function ExerciseList({
  rows,
  studentId,
  today,
}: {
  rows: ExerciseRow[];
  studentId: string;
  today: string;
}) {
  const [state, setState] = useState(rows);
  const [error, setError] = useState<string | null>(null);
  const [unsaved, setUnsaved] = useState(0);
  const [sheet, setSheet] = useState<ExerciseRow | null>(null);
  // Which exercise the member just logged, and for how long to rest.
  const [resting, setResting] = useState<{
    name: string;
    seconds: number;
    /** When rest began. Doubles as the timer's React key, so logging
     *  another set restarts the clock instead of resuming the old one. */
    at: number;
  } | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // A bottom sheet that only closes by tapping the scrim is a trap for
  // anyone on a keyboard, and Escape is what everyone tries first.
  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheet(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheet]);

  const doneCount = state.filter((r) => r.done).length;
  const pct = state.length ? Math.round((doneCount / state.length) * 100) : 0;
  // Mid-workout a flat list of twelve rows gives the eye nothing to
  // land on. The first unfinished movement is the one being done right
  // now, so it is the only one drawn as current.
  const currentId = state.find((r) => !r.done)?.itemId ?? null;

  /** Sends one log. Never throws: a dead connection surfaces as a
   *  rejected fetch rather than an `{ error }`, and a queue that falls
   *  over on the very failure it exists for is not a queue. Returns
   *  whether the server took it. */
  const push = useCallback(async (log: PendingLog) => {
    try {
      const supabase = createClient();
      // One row per item per day, so a re-tap — or a retry — updates
      // rather than stacking.
      const { error: err } = await supabase.from("workout_logs").upsert(
        { ...log, updated_at: new Date().toISOString() },
        { onConflict: "program_item_id,performed_on" }
      );
      if (err) return false;
    } catch {
      return false;
    }
    forget(log);
    return true;
  }, []);

  const save = useCallback(
    async (row: ExerciseRow) => {
      const log: PendingLog = {
        program_item_id: row.itemId,
        student_id: studentId,
        performed_on: today,
        weight_kg: row.weight,
        completed: row.done,
      };
      // Written down before it is sent, so a dropped connection costs
      // nothing but a delay.
      remember(log);
      const ok = await push(log);
      setUnsaved(pending().length);
      setError(ok ? null : "اتصال قطع است — ثبت شد و به‌محض وصل‌شدن ارسال می‌شود.");
    },
    [studentId, today, push]
  );

  // Flush whatever an earlier session, or an earlier dead spot, left
  // behind: once on mount and again whenever the connection returns.
  useEffect(() => {
    let cancelled = false;

    const flush = async () => {
      const queue = pending();
      if (queue.length === 0) return;
      for (const log of queue) {
        if (cancelled) return;
        // Stop at the first refusal: the rest will fail the same way,
        // and `online` or the next save will bring us back.
        if (!(await push(log))) break;
      }
      if (cancelled) return;
      const remaining = pending().length;
      setUnsaved(remaining);
      if (remaining === 0) setError(null);
    };

    void flush();
    window.addEventListener("online", flush);
    return () => {
      cancelled = true;
      window.removeEventListener("online", flush);
    };
  }, [push]);

  function toggle(itemId: string) {
    setState((prev) => {
      const next = prev.map((r) => (r.itemId === itemId ? { ...r, done: !r.done } : r));
      const row = next.find((r) => r.itemId === itemId)!;
      void save(row);
      // Rest starts on completion, not on un-ticking a mistake.
      setResting(
        row.done && row.rest > 0
          ? { name: row.name, seconds: row.rest, at: Date.now() }
          : null
      );
      return next;
    });
  }

  function setWeight(itemId: string, raw: string) {
    const value = raw === "" ? null : Number(raw);
    setState((prev) => {
      const next = prev.map((r) => (r.itemId === itemId ? { ...r, weight: value } : r));
      const row = next.find((r) => r.itemId === itemId)!;
      // Wait until they stop typing — otherwise "60" writes 6 then 60.
      clearTimeout(timers.current[itemId]);
      timers.current[itemId] = setTimeout(() => void save(row), 700);
      return next;
    });
  }

  return (
    <>
      {/* Progress leads the screen: mid-workout the question is always
          "how much is left", and a bare bar could not answer it. */}
      <div className="fc-card fc-rise mb-4 flex items-center gap-4 p-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <b className="text-sm text-fc-muted">پیشرفت امروز</b>
            <span className="fc-num text-sm text-fc-muted">
              {faDigits(doneCount)} از {faDigits(state.length)}
            </span>
          </div>
          <div className="fc-bar">
            <i style={{ width: `${pct}%` }} />
          </div>
        </div>
        <b
          className="fc-figure shrink-0 text-2xl"
          style={{ color: pct === 100 ? "var(--color-fc-ok)" : "var(--color-fc-cyan)" }}
        >
          {faDigits(pct)}٪
        </b>
      </div>

      {error && (
        <p
          role="status"
          className="fc-notice mb-3"
        >
          <CloudOff className="size-4 shrink-0" aria-hidden />
          {error}
          {unsaved > 0 && (
            <>
              {" ("}
              <span className="fc-num">{faDigits(unsaved)}</span>
              {")"}
            </>
          )}
        </p>
      )}

      <ul className="fc-stagger grid list-none gap-2.5 p-0">
        {state.map((row) => (
          <li
            key={row.itemId}
            className={`fc-card flex items-center gap-3.5 p-4 transition-colors ${
              row.done
                ? "border-fc-ok/40 bg-fc-ok/5"
                : row.itemId === currentId
                  ? "fc-current"
                  : ""
            }`}
          >
            <button
              type="button"
              onClick={() => setSheet(row)}
              aria-label={`راهنمای ${row.name}`}
              className="fc-card-link relative grid size-13 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[var(--fc-line2)] bg-fc-navy2/60 text-fc-cyan"
            >
              {row.hasVideo ? (
                <Play className="size-5" aria-hidden />
              ) : (
                <Info className="size-5" aria-hidden />
              )}
            </button>

            <div className="min-w-0 flex-1">
              <b className={`block text-md ${row.done ? "text-fc-muted" : ""}`}>
                {row.name}
              </b>
              {row.itemId === currentId && (
                <span className="fc-eyebrow mb-0.5 block text-2xs">حرکت بعدی</span>
              )}
              <small className="text-xs text-fc-dim">
                <span className="fc-num">{faDigits(row.sets)}</span> ست ×{" "}
                <span className="fc-num">{faDigits(row.reps)}</span> تکرار
                {row.rest > 0 && (
                  <>
                    {" · "}
                    <span className="fc-num">{faDigits(row.rest)}</span> ثانیه استراحت
                  </>
                )}
              </small>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0"
                  id={`w-${row.itemId}`}
                  aria-label={`وزنه ${row.name} به کیلوگرم`}
                  value={row.weight ?? ""}
                  placeholder="—"
                  onChange={(e) => setWeight(row.itemId, e.target.value)}
                  className="fc-num w-[68px] rounded-xl border border-[var(--fc-line2)] bg-fc-ink px-2 text-center text-md focus:border-fc-cyan focus:outline-none"
                  style={{ minHeight: 40, fontSize: 16 }}
                />
                <span className="text-xs text-fc-dim">کیلو</span>
                <WeightDelta previous={row.previous} current={row.weight} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggle(row.itemId)}
              aria-pressed={row.done}
              aria-label={`${row.name} — ${row.done ? "انجام شد" : "علامت‌زدن انجام‌شده"}`}
              className={`grid size-12 shrink-0 place-items-center rounded-full border-[1.5px] transition-all duration-200 active:scale-90 ${
                row.done
                  ? "border-fc-ok bg-fc-ok text-fc-ink"
                  : "border-[var(--fc-line2)] text-fc-dim hover:border-fc-cyan hover:text-fc-cyan"
              }`}
            >
              {/* Empty until done. A dimmed tick in every row reads as
                  "already logged" at a glance across a long list. */}
              {row.done && <Check className="size-5" strokeWidth={3} aria-hidden />}
            </button>
          </li>
        ))}
      </ul>

      {resting && (
        <RestTimer
          key={resting.at}
          seconds={resting.seconds}
          exercise={resting.name}
          onDone={() => setResting(null)}
        />
      )}

      {sheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sheet-title"
          onClick={() => setSheet(null)}
        >
          <div
            className="fc-raised fc-rise w-full max-w-[520px] p-6"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 24px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start gap-3">
              <h2 id="sheet-title" className="flex-1 text-lg">
                {sheet.name}
              </h2>
              <button
                type="button"
                onClick={() => setSheet(null)}
                aria-label="بستن"
                className="grid size-11 place-items-center rounded-xl text-fc-dim transition-colors hover:text-fc-text"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <div className="mb-4 grid aspect-video place-items-center rounded-xl border border-[var(--fc-line2)] bg-fc-navy2/50 text-fc-dim">
              <div className="text-center">
                <Play className="mx-auto mb-2 size-9 opacity-60" aria-hidden />
                <p className="text-sm">
                  {sheet.hasVideo
                    ? "ویدیو در حال آماده‌سازی است"
                    : "ادمین هنوز ویدیویی برای این حرکت ثبت نکرده"}
                </p>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-fc-muted">
              {sheet.instructions ?? "توضیحی برای این حرکت ثبت نشده است."}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
