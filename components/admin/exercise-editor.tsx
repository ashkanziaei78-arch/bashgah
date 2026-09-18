"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Film, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { saveExercise, deleteExercise, type ExerciseInput } from "@/app/admin/actions";
import { faDigits } from "@/lib/format";

export interface ExerciseRow extends ExerciseInput {
  id: string;
}

const LEVELS = [
  { value: "beginner", label: "مبتدی" },
  { value: "intermediate", label: "متوسط" },
  { value: "advanced", label: "پیشرفته" },
] as const;

const LEVEL_LABEL: Record<string, string> = {
  beginner: "مبتدی",
  intermediate: "متوسط",
  advanced: "پیشرفته",
};

const BLANK: ExerciseInput = {
  name: "",
  muscleGroup: "",
  level: "beginner",
  instructions: "",
  videoPath: "",
  durationSeconds: null,
};

export function ExerciseEditor({ rows }: { rows: ExerciseRow[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<ExerciseInput>(BLANK);
  const [group, setGroup] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const groups = useMemo(
    () => [...new Set(rows.map((r) => r.muscleGroup))].sort(),
    [rows]
  );

  const visible = group === "all" ? rows : rows.filter((r) => r.muscleGroup === group);

  function open(row: ExerciseRow | null) {
    setError(null);
    if (row) {
      setEditing(row.id);
      const { id: _id, ...rest } = row;
      void _id;
      setDraft(rest);
    } else {
      setEditing("new");
      // Pre-fill the group being filtered — most additions come in batches
      setDraft({ ...BLANK, muscleGroup: group === "all" ? "" : group });
    }
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await saveExercise(editing === "new" ? null : editing, draft);
      if (!result.ok) {
        setError(result.message ?? "ذخیره نشد.");
        return;
      }
      setEditing(null);
      router.refresh();
    });
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteExercise(id);
      if (!result.ok) setError(result.message ?? "حذف نشد.");
      else router.refresh();
    });
  }

  return (
    <>
      {groups.length > 1 && (
        <div className="fc-scroll -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1">
          {["all", ...groups].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setGroup(value)}
              aria-pressed={group === value}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-[12px] font-bold transition-colors ${
                group === value
                  ? "border-fc-cyan bg-fc-cyan/12 text-fc-cyan"
                  : "border-[var(--fc-line2)] text-fc-muted hover:text-fc-text"
              }`}
            >
              {value === "all" ? "همه" : value}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="mb-3 text-[12.5px] text-fc-bad">
          {error}
        </p>
      )}

      <ul className="grid list-none gap-2.5 p-0">
        {visible.map((row) => (
          <li key={row.id} className="fc-card p-3.5">
            {editing === row.id ? (
              <ExerciseForm
                draft={draft}
                setDraft={setDraft}
                pending={pending}
                onSave={submit}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div className="flex items-start gap-3">
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-xl border ${
                    row.videoPath
                      ? "border-fc-cyan/40 bg-fc-cyan/10 text-fc-cyan"
                      : "border-[var(--fc-line2)] text-fc-dim"
                  }`}
                >
                  <Film className="size-[18px]" />
                </span>

                <div className="min-w-0 flex-1">
                  <b className="block text-[13.5px]">{row.name}</b>
                  <small className="block text-[11.5px] text-fc-dim">
                    {row.muscleGroup} · {LEVEL_LABEL[row.level]}
                    {row.durationSeconds && ` · ${faDigits(row.durationSeconds)} ثانیه`}
                  </small>
                  {!row.videoPath && (
                    <small className="mt-1 block text-[11px] text-fc-warn">
                      ویدیویی ثبت نشده
                    </small>
                  )}
                </div>

                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => open(row)}
                    aria-label={`ویرایش ${row.name}`}
                    className="grid size-9 place-items-center rounded-lg text-fc-dim transition-colors hover:text-fc-cyan"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => remove(row.id)}
                    aria-label={`حذف ${row.name}`}
                    className="grid size-9 place-items-center rounded-lg text-fc-dim transition-colors hover:text-fc-bad"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {editing === "new" ? (
        <div className="fc-card mt-2.5 p-4">
          <ExerciseForm
            draft={draft}
            setDraft={setDraft}
            pending={pending}
            onSave={submit}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : (
        <button type="button" onClick={() => open(null)} className="fc-btn fc-btn-ghost mt-3 w-full">
          <Plus className="size-[18px]" />
          حرکت تازه
        </button>
      )}
    </>
  );
}

function ExerciseForm({
  draft,
  setDraft,
  pending,
  onSave,
  onCancel,
}: {
  draft: ExerciseInput;
  setDraft: (next: ExerciseInput) => void;
  pending: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="grid gap-3">
      <div>
        <label htmlFor="ex-name" className="mb-1.5 block text-[12.5px] text-fc-muted">
          نام حرکت
        </label>
        <input
          id="ex-name"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="مثلاً پرس سینه هالتر"
          className="fc-input"
          style={{ fontSize: 16 }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label htmlFor="ex-group" className="mb-1.5 block text-[12.5px] text-fc-muted">
            گروه عضلانی
          </label>
          <input
            id="ex-group"
            value={draft.muscleGroup}
            onChange={(e) => setDraft({ ...draft, muscleGroup: e.target.value })}
            placeholder="مثلاً سینه"
            className="fc-input"
            style={{ fontSize: 16 }}
          />
        </div>

        <div>
          <label htmlFor="ex-level" className="mb-1.5 block text-[12.5px] text-fc-muted">
            سطح
          </label>
          <select
            id="ex-level"
            value={draft.level}
            onChange={(e) =>
              setDraft({ ...draft, level: e.target.value as ExerciseInput["level"] })
            }
            className="fc-input"
            style={{ fontSize: 16 }}
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="ex-note" className="mb-1.5 block text-[12.5px] text-fc-muted">
          راهنمای اجرا
        </label>
        <textarea
          id="ex-note"
          rows={3}
          value={draft.instructions}
          onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
          placeholder="مثلاً کتف‌ها را جمع نگه دار، هالتر را تا روی خط سینه پایین بیاور."
          className="fc-input resize-y"
          style={{ fontSize: 16 }}
        />
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2.5">
        <div>
          <label htmlFor="ex-video" className="mb-1.5 block text-[12.5px] text-fc-muted">
            مسیر ویدیو در Storage
          </label>
          <input
            id="ex-video"
            dir="ltr"
            value={draft.videoPath}
            onChange={(e) => setDraft({ ...draft, videoPath: e.target.value })}
            placeholder="bench-press.mp4"
            className="fc-input fc-lat text-start"
            style={{ fontSize: 16, letterSpacing: "normal", textTransform: "none" }}
          />
        </div>

        <div>
          <label htmlFor="ex-dur" className="mb-1.5 block text-[12.5px] text-fc-muted">
            ثانیه
          </label>
          <input
            id="ex-dur"
            type="number"
            inputMode="numeric"
            min={1}
            max={3600}
            value={draft.durationSeconds ?? ""}
            placeholder="—"
            onChange={(e) =>
              setDraft({
                ...draft,
                durationSeconds: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            className="fc-input fc-lat w-20 text-center"
            style={{ fontSize: 16 }}
          />
        </div>
      </div>

      <p className="text-[11.5px] leading-relaxed text-fc-muted">
        ویدیو را در باکت <code dir="ltr" className="fc-lat text-[11px] text-fc-text">exercise-videos</code>{" "}
        بارگذاری کنید و فقط نام فایل را اینجا بنویسید.
      </p>

      <div className="flex gap-2.5">
        <button type="button" disabled={pending} onClick={onSave} className="fc-btn flex-1">
          {pending ? <Loader2 className="size-[18px] animate-spin" /> : <Check className="size-[18px]" />}
          ذخیره
        </button>
        <button type="button" onClick={onCancel} className="fc-btn fc-btn-ghost shrink-0">
          <X className="size-[18px]" />
          انصراف
        </button>
      </div>
    </div>
  );
}
