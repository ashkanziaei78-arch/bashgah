"use client";

import { useState, useRef, useCallback } from "react";
import { Check, Play, Info, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { faDigits } from "@/lib/format";

export interface ExerciseRow {
  itemId: string;
  name: string;
  sets: number;
  reps: number;
  instructions: string | null;
  hasVideo: boolean;
  weight: number | null;
  done: boolean;
  previous: number | null;
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
  const [sheet, setSheet] = useState<ExerciseRow | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const doneCount = state.filter((r) => r.done).length;
  const pct = state.length ? Math.round((doneCount / state.length) * 100) : 0;

  const save = useCallback(
    async (row: ExerciseRow) => {
      const supabase = createClient();
      const { error: err } = await supabase.from("workout_logs").upsert(
        {
          program_item_id: row.itemId,
          student_id: studentId,
          performed_on: today,
          weight_kg: row.weight,
          completed: row.done,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "program_item_id,performed_on" }
      );
      // One row per item per day, so a re-tap updates rather than stacking.
      setError(err ? "ثبت نشد. اتصال اینترنت را بررسی کنید و دوباره بزنید." : null);
    },
    [studentId, today]
  );

  function toggle(itemId: string) {
    setState((prev) => {
      const next = prev.map((r) => (r.itemId === itemId ? { ...r, done: !r.done } : r));
      const row = next.find((r) => r.itemId === itemId)!;
      void save(row);
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
      <div className="mb-4 flex items-center gap-3">
        <div className="fc-bar flex-1">
          <i style={{ width: `${pct}%` }} />
        </div>
        <span className="fc-chip fc-chip-cy fc-num shrink-0">
          {faDigits(doneCount)} از {faDigits(state.length)}
        </span>
      </div>

      {error && (
        <p role="alert" className="mb-3 text-[12.5px] text-fc-bad">
          {error}
        </p>
      )}

      <ul className="grid list-none gap-2.5 p-0">
        {state.map((row) => (
          <li
            key={row.itemId}
            className={`fc-card flex items-center gap-3 p-3.5 transition-opacity ${
              row.done ? "border-fc-ok/35 opacity-60" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => setSheet(row)}
              aria-label={`راهنمای ${row.name}`}
              className="relative grid size-13 shrink-0 place-items-center overflow-hidden rounded-xl border border-[var(--fc-line2)] bg-fc-navy2/60 text-fc-cyan"
            >
              {row.hasVideo ? <Play className="size-[18px]" /> : <Info className="size-[18px]" />}
            </button>

            <div className="min-w-0 flex-1">
              <b className="block text-[13.5px]">{row.name}</b>
              <small className="fc-lat text-[11px] tracking-[0.05em] text-fc-dim">
                {faDigits(row.sets)} ست × {faDigits(row.reps)} تکرار
              </small>

              <div className="mt-1.5 flex items-center gap-2">
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
                  className="fc-lat w-16 rounded-lg border border-[var(--fc-line2)] bg-fc-ink px-2 py-1 text-center text-xs font-bold focus:border-fc-cyan focus:outline-none"
                  style={{ minHeight: 32, fontSize: 16 }}
                />
                <span className="text-[11px] text-fc-dim">کیلو</span>
                {row.previous !== null && (
                  <em className="ms-auto text-[11px] not-italic text-fc-muted">
                    قبلی: {faDigits(row.previous)} کیلو
                  </em>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggle(row.itemId)}
              aria-pressed={row.done}
              aria-label={`${row.name} — ${row.done ? "انجام شد" : "علامت‌زدن انجام‌شده"}`}
              className={`grid size-11 shrink-0 place-items-center rounded-full border-[1.5px] transition-colors ${
                row.done
                  ? "border-fc-ok bg-fc-ok text-fc-ink"
                  : "border-[var(--fc-line2)] text-fc-dim hover:border-fc-cyan hover:text-fc-cyan"
              }`}
            >
              <Check className="size-4" strokeWidth={3} />
            </button>
          </li>
        ))}
      </ul>

      {sheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sheet-title"
          onClick={() => setSheet(null)}
        >
          <div
            className="fc-raised w-full max-w-[520px] p-6"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 24px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start gap-3">
              <h2 id="sheet-title" className="flex-1 text-base">
                {sheet.name}
              </h2>
              <button
                type="button"
                onClick={() => setSheet(null)}
                aria-label="بستن"
                className="grid size-9 place-items-center rounded-lg text-fc-dim hover:text-fc-text"
              >
                <X className="size-[18px]" />
              </button>
            </div>

            <div className="mb-4 grid aspect-video place-items-center rounded-xl border border-[var(--fc-line2)] bg-fc-navy2/50 text-fc-dim">
              <div className="text-center">
                <Play className="mx-auto mb-2 size-8 opacity-60" />
                <p className="text-[12.5px]">
                  {sheet.hasVideo
                    ? "ویدیو در حال آماده‌سازی است"
                    : "ادمین هنوز ویدیویی برای این حرکت ثبت نکرده"}
                </p>
              </div>
            </div>

            <p className="text-[13px] leading-relaxed text-fc-muted">
              {sheet.instructions ?? "توضیحی برای این حرکت ثبت نشده است."}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
