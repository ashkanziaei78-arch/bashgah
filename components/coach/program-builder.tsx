"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";
import { saveProgram } from "@/app/coach/actions";
import { faDigits } from "@/lib/format";
import { CoverPicker } from "./cover-picker";

export interface ExerciseOption {
  id: string;
  name: string;
  muscle_group: string;
  level: string;
}

export interface DraftItem {
  key: string;
  exerciseId: string;
  sets: number;
  reps: number;
  rest: number;
  note: string;
}

let counter = 0;
const nextKey = () => `item-${counter++}`;

export function ProgramBuilder({
  studentId,
  exercises,
  initialTitle,
  initialNotes,
  initialItems,
  initialCover,
  carriedOver,
}: {
  studentId: string;
  exercises: ExerciseOption[];
  initialTitle: string;
  initialNotes: string;
  initialItems: DraftItem[];
  initialCover: string | null;
  carriedOver: boolean;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [notes, setNotes] = useState(initialNotes);
  const [cover, setCover] = useState<string | null>(initialCover);
  const [items, setItems] = useState<DraftItem[]>(initialItems);
  const [picked, setPicked] = useState(exercises[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const byId = useMemo(
    () => new Map(exercises.map((e) => [e.id, e])),
    [exercises]
  );

  const groups = useMemo(() => {
    const map = new Map<string, ExerciseOption[]>();
    for (const exercise of exercises) {
      const list = map.get(exercise.muscle_group) ?? [];
      list.push(exercise);
      map.set(exercise.muscle_group, list);
    }
    return [...map.entries()];
  }, [exercises]);

  function add() {
    if (!picked) return;
    setItems((prev) => [
      ...prev,
      { key: nextKey(), exerciseId: picked, sets: 3, reps: 12, rest: 90, note: "" },
    ]);
    setSaved(false);
  }

  function patch(key: string, change: Partial<DraftItem>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...change } : i)));
    setSaved(false);
  }

  function remove(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
    setSaved(false);
  }

  /** Order is the order the member trains in, so it has to be editable. */
  function move(index: number, direction: -1 | 1) {
    setItems((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSaved(false);
  }

  function submit(publish: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await saveProgram(studentId, {
        title,
        notes,
        items: items.map(({ exerciseId, sets, reps, rest, note }) => ({
          exerciseId,
          sets,
          reps,
          rest,
          note,
        })),
        coverPath: cover,
        publish,
      });

      if (!result.ok) {
        setError(result.message ?? "ذخیره نشد.");
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  const totalSets = items.reduce((sum, i) => sum + i.sets, 0);

  return (
    <>
      {carriedOver && (
        <p className="fc-card mb-3.5 p-3.5 text-[12.5px] leading-relaxed text-fc-muted">
          برنامه‌ی قبلی به‌عنوان پیش‌نویس باز شده. تغییرش بدهید و منتشر کنید —
          نسخه‌ی قبلی بایگانی می‌شود و سابقه‌ی وزنه‌ها دست‌نخورده می‌ماند.
        </p>
      )}

      <div className="fc-card grid gap-3 p-4">
        <div>
          <label htmlFor="title" className="mb-1.5 block text-[12.5px] text-fc-muted">
            عنوان برنامه
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSaved(false);
            }}
            placeholder="مثلاً سینه و جلوبازو"
            className="fc-input"
            style={{ fontSize: 16 }}
          />
        </div>

        <div>
          <label htmlFor="notes" className="mb-1.5 block text-[12.5px] text-fc-muted">
            یادداشت برای شاگرد
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setSaved(false);
            }}
            rows={2}
            placeholder="مثلاً بین ست‌ها ۹۰ ثانیه استراحت."
            className="fc-input resize-y"
            style={{ fontSize: 16 }}
          />
        </div>

        <CoverPicker
          value={cover}
          onChange={(path) => {
            setCover(path);
            setSaved(false);
          }}
        />
      </div>

      <h2 className="mt-6 mb-3 flex items-center gap-2 text-[14.5px]">
        حرکات
        {items.length > 0 && (
          <span className="fc-chip fc-num ms-auto">
            {faDigits(items.length)} حرکت · {faDigits(totalSets)} ست
          </span>
        )}
      </h2>

      {items.length === 0 ? (
        <p className="fc-card p-4 text-[13px] text-fc-muted">
          هنوز حرکتی اضافه نشده. از پایین انتخاب کنید.
        </p>
      ) : (
        <ul className="grid list-none gap-2.5 p-0">
          {items.map((item, index) => {
            const exercise = byId.get(item.exerciseId);
            return (
              <li key={item.key} className="fc-card p-3.5">
                <div className="flex items-start gap-2.5">
                  <span className="fc-lat fc-num grid size-8 shrink-0 place-items-center rounded-lg border border-[var(--fc-line2)] text-[12px] font-extrabold text-fc-cyan">
                    {faDigits(index + 1)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <b className="block text-[13.5px]">{exercise?.name ?? "—"}</b>
                    <small className="text-[11px] text-fc-dim">
                      {exercise?.muscle_group}
                    </small>
                  </div>

                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label="بالاتر"
                      className="grid size-8 place-items-center rounded-lg text-fc-dim transition-colors hover:text-fc-cyan disabled:opacity-30"
                    >
                      <ChevronUp className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === items.length - 1}
                      aria-label="پایین‌تر"
                      className="grid size-8 place-items-center rounded-lg text-fc-dim transition-colors hover:text-fc-cyan disabled:opacity-30"
                    >
                      <ChevronDown className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item.key)}
                      aria-label={`حذف ${exercise?.name ?? "حرکت"}`}
                      className="grid size-8 place-items-center rounded-lg text-fc-dim transition-colors hover:text-fc-bad"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  {(
                    [
                      ["ست", "sets", item.sets, 1, 20],
                      ["تکرار", "reps", item.reps, 1, 100],
                      ["استراحت (ثانیه)", "rest", item.rest, 0, 600],
                    ] as const
                  ).map(([label, field, value, min, max]) => (
                    <div key={field}>
                      <label
                        htmlFor={`${field}-${item.key}`}
                        className="mb-1 block text-[11px] text-fc-dim"
                      >
                        {label}
                      </label>
                      <input
                        id={`${field}-${item.key}`}
                        type="number"
                        inputMode="numeric"
                        min={min}
                        max={max}
                        value={value}
                        onChange={(e) =>
                          patch(item.key, { [field]: Number(e.target.value) })
                        }
                        className="fc-lat w-full rounded-lg border border-[var(--fc-line2)] bg-fc-ink px-2 py-1.5 text-center font-bold focus:border-fc-cyan focus:outline-none"
                        style={{ minHeight: 40, fontSize: 16 }}
                      />
                    </div>
                  ))}
                </div>

                <input
                  value={item.note}
                  onChange={(e) => patch(item.key, { note: e.target.value })}
                  placeholder="یادداشت این حرکت (اختیاری)"
                  aria-label={`یادداشت ${exercise?.name ?? "حرکت"}`}
                  className="fc-input mt-2"
                  style={{ fontSize: 16, minHeight: 42 }}
                />
              </li>
            );
          })}
        </ul>
      )}

      <div className="fc-card mt-3.5 flex items-end gap-2.5 p-3.5">
        <div className="min-w-0 flex-1">
          <label htmlFor="picker" className="mb-1.5 block text-[12.5px] text-fc-muted">
            افزودن حرکت از کتابخانه
          </label>
          <select
            id="picker"
            value={picked}
            onChange={(e) => setPicked(e.target.value)}
            className="fc-input"
            style={{ fontSize: 16 }}
          >
            {groups.map(([group, list]) => (
              <optgroup key={group} label={group}>
                {list.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <button type="button" onClick={add} className="fc-btn shrink-0">
          <Plus className="size-[18px]" />
          افزودن
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-[12.5px] text-fc-bad">
          {error}
        </p>
      )}
      {saved && (
        <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-fc-ok">
          <Check className="size-4" />
          ذخیره شد.
        </p>
      )}

      <div className="mt-4 flex gap-2.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => submit(true)}
          className="fc-btn flex-1"
        >
          {pending ? <Loader2 className="size-[18px] animate-spin" /> : null}
          انتشار برای شاگرد
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => submit(false)}
          className="fc-btn fc-btn-ghost shrink-0"
        >
          پیش‌نویس
        </button>
      </div>

      <div className="h-6" />
    </>
  );
}
