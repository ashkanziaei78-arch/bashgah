"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Activity, Check, ChevronDown, Loader2 } from "lucide-react";
import { saveBodyAnalysis, type BodyAnalysisInput } from "@/app/coach/actions";
import { faDate, faDigits } from "@/lib/format";

/** One field of the analyser's printout. `step` drives the numeric
 *  keypad's precision; `hint` is the unit as it appears on the slip. */
const FIELDS: {
  key: keyof Omit<BodyAnalysisInput, "measuredOn" | "note">;
  label: string;
  hint: string;
  step: number;
}[] = [
  { key: "weightKg", label: "وزن", hint: "کیلوگرم", step: 0.1 },
  { key: "bodyFatPct", label: "درصد چربی", hint: "٪", step: 0.1 },
  { key: "muscleMassKg", label: "توده‌ی عضلانی", hint: "کیلوگرم", step: 0.1 },
  { key: "bodyWaterPct", label: "آب بدن", hint: "٪", step: 0.1 },
  { key: "boneMassKg", label: "توده‌ی استخوانی", hint: "کیلوگرم", step: 0.1 },
  { key: "visceralFat", label: "چربی احشایی", hint: "سطح", step: 1 },
  { key: "metabolicAge", label: "سن متابولیک", hint: "سال", step: 1 },
  { key: "bmrKcal", label: "سوخت‌وساز پایه", hint: "کالری", step: 1 },
];

const GIRTHS: { key: keyof BodyAnalysisInput; label: string }[] = [
  { key: "chestCm", label: "دور سینه" },
  { key: "armCm", label: "دور بازو" },
  { key: "waistCm", label: "دور کمر" },
  { key: "hipCm", label: "دور باسن" },
  { key: "thighCm", label: "دور ران" },
  { key: "neckCm", label: "دور گردن" },
];

type Draft = Record<string, string>;

/** Keying in the body composition printout.
 *
 *  Every field is optional because no two machines print the same set,
 *  and a tape measure at the desk prints none of them. What matters is
 *  that whatever is entered lands as `source = 'analyzer'` — the one
 *  reading in the member's history that did not come from them, and
 *  the one the row level security will not let them write themselves.
 */
export function BodyAnalysisForm({
  studentId,
  today,
  lastTestOn,
}: {
  studentId: string;
  today: string;
  lastTestOn: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [measuredOn, setMeasuredOn] = useState(today);
  const [draft, setDraft] = useState<Draft>({});
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const num = (key: string): number | null => {
    const raw = draft[key];
    if (raw === undefined || raw.trim() === "") return null;
    const v = Number(raw);
    return Number.isFinite(v) ? v : null;
  };

  function set(key: string, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await saveBodyAnalysis(studentId, {
        measuredOn,
        weightKg: num("weightKg"),
        bodyFatPct: num("bodyFatPct"),
        muscleMassKg: num("muscleMassKg"),
        bodyWaterPct: num("bodyWaterPct"),
        boneMassKg: num("boneMassKg"),
        visceralFat: num("visceralFat"),
        metabolicAge: num("metabolicAge"),
        bmrKcal: num("bmrKcal"),
        neckCm: num("neckCm"),
        chestCm: num("chestCm"),
        waistCm: num("waistCm"),
        hipCm: num("hipCm"),
        armCm: num("armCm"),
        thighCm: num("thighCm"),
        note,
      });

      if (!result.ok) {
        setError(result.message ?? "ثبت نشد.");
        return;
      }
      setSaved(true);
      setDraft({});
      setNote("");
      router.refresh();
    });
  }

  return (
    <section className="fc-raised p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-start"
      >
        <Activity className="size-4 shrink-0 text-fc-cyan" />
        <span className="min-w-0 flex-1">
          <b className="block text-[14.5px]">آنالیز بدنی</b>
          <small className="text-[11.5px] text-fc-dim">
            {lastTestOn
              ? `آخرین تست: ${faDate(lastTestOn)}`
              : "هنوز تستی برای این عضو ثبت نشده"}
          </small>
        </span>
        <ChevronDown
          className={`size-[18px] shrink-0 text-fc-dim transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-4">
          <p className="mb-4 text-[12.5px] leading-relaxed text-fc-muted">
            هر عددی از برگه‌ی دستگاه که دارید وارد کنید؛ بقیه را خالی بگذارید.
            نتیجه در تب «پیشرفت» خود عضو دیده می‌شود و وزنش هدف کالری او را
            به‌روز می‌کند.
          </p>

          <label htmlFor="testDate" className="mb-1.5 block text-[12px] text-fc-dim">
            تاریخ تست
          </label>
          <input
            id="testDate"
            type="date"
            value={measuredOn}
            max={today}
            onChange={(e) => setMeasuredOn(e.target.value)}
            dir="ltr"
            className="fc-input text-center"
            style={{ fontSize: 16 }}
          />

          <h3 className="mt-4 mb-2 text-[13px]">ترکیب بدن</h3>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label
                  htmlFor={`bm-${f.key}`}
                  className="mb-1 block text-[11px] text-fc-dim"
                >
                  {f.label}
                  <span className="ms-1 text-fc-dim/70">({f.hint})</span>
                </label>
                <input
                  id={`bm-${f.key}`}
                  type="number"
                  inputMode="decimal"
                  step={f.step}
                  value={draft[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder="-"
                  dir="ltr"
                  className="fc-lat w-full rounded-lg border border-[var(--fc-line2)] bg-fc-ink px-2 py-1.5 text-center font-extrabold focus:border-fc-cyan focus:outline-none"
                  style={{ minHeight: 44, fontSize: 16 }}
                />
              </div>
            ))}
          </div>

          <h3 className="mt-4 mb-2 text-[13px]">دورهای بدن (سانتی‌متر)</h3>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {GIRTHS.map((g) => (
              <div key={g.key}>
                <label
                  htmlFor={`bm-${g.key}`}
                  className="mb-1 block text-[11px] text-fc-dim"
                >
                  {g.label}
                </label>
                <input
                  id={`bm-${g.key}`}
                  type="number"
                  inputMode="decimal"
                  step={0.5}
                  value={draft[g.key] ?? ""}
                  onChange={(e) => set(g.key, e.target.value)}
                  placeholder="-"
                  dir="ltr"
                  className="fc-lat w-full rounded-lg border border-[var(--fc-line2)] bg-fc-ink px-2 py-1.5 text-center font-extrabold focus:border-fc-cyan focus:outline-none"
                  style={{ minHeight: 44, fontSize: 16 }}
                />
              </div>
            ))}
          </div>

          <label htmlFor="bm-note" className="mt-4 mb-1.5 block text-[12px] text-fc-dim">
            یادداشت (اختیاری)
          </label>
          <textarea
            id="bm-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="مثلاً: تست بعد از تمرین گرفته شد، آب بدن پایین‌تر از حد معمول"
            className="fc-input resize-y"
            style={{ fontSize: 16 }}
          />

          {error && (
            <p role="alert" className="mt-3 text-[12.5px] text-fc-bad">
              {error}
            </p>
          )}
          {saved && !error && (
            <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-fc-ok">
              <Check className="size-4" />
              آنالیز {faDigits(faDate(measuredOn))} ثبت شد.
            </p>
          )}

          <button
            type="button"
            disabled={pending}
            onClick={submit}
            className="fc-btn mt-4 w-full"
          >
            {pending ? <Loader2 className="size-[18px] animate-spin" /> : null}
            ثبت آنالیز
          </button>
        </div>
      )}
    </section>
  );
}
