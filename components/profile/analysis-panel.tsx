import { ScanLine, ArrowUp, ArrowDown } from "lucide-react";
import { faDate, faDigits } from "@/lib/format";

export interface AnalyzerRow {
  measured_on: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  fat_mass_kg: number | null;
  skeletal_muscle_kg: number | null;
  muscle_mass_kg: number | null;
  body_water_pct: number | null;
  protein_kg: number | null;
  minerals_kg: number | null;
  bmi: number | null;
  whr: number | null;
  visceral_fat: number | null;
  bmr_kcal: number | null;
  metabolic_age: number | null;
  inbody_score: number | null;
}

/** Field, label, unit, and which direction is good news. */
const FIELDS: [keyof AnalyzerRow, string, string, "up" | "down" | null][] = [
  ["weight_kg", "وزن", "کیلو", null],
  ["skeletal_muscle_kg", "عضله‌ی اسکلتی", "کیلو", "up"],
  ["body_fat_pct", "درصد چربی", "٪", "down"],
  ["fat_mass_kg", "توده‌ی چربی", "کیلو", "down"],
  ["bmr_kcal", "سوخت‌وساز پایه", "کالری", "up"],
  ["visceral_fat", "چربی احشایی", "سطح", "down"],
  ["body_water_pct", "آب بدن", "٪", null],
  ["protein_kg", "پروتئین بدن", "کیلو", "up"],
  ["minerals_kg", "مواد معدنی", "کیلو", null],
  ["bmi", "BMI", "", null],
  ["whr", "دور کمر به باسن", "", "down"],
  ["metabolic_age", "سن متابولیک", "سال", "down"],
  ["inbody_score", "امتیاز بدن", "از ۱۰۰", "up"],
];

function n(v: number | string | null): number | null {
  return v === null ? null : Number(v);
}

/** The body analyser's readout, as the member sees it.
 *
 *  Read-only on purpose: these numbers only ever come from the gym's
 *  machine, keyed in by staff from the printout. The database refuses an
 *  analyser row from anyone else. */
export function AnalysisPanel({ rows }: { rows: AnalyzerRow[] }) {
  const [latest, previous] = rows;

  return (
    <section className="fc-card p-5">
      <h2 className="mb-1 flex items-center gap-2 text-[15px]">
        <ScanLine className="size-5 text-fc-cyan" />
        آنالیز بدن
      </h2>
      <p className="mb-4 text-[12px] text-fc-muted">
        فقط با دستگاه آنالیز ترکیب بدن در باشگاه ثبت می‌شود؛ برای تست تازه به پذیرش بگویید.
      </p>

      {!latest ? (
        <p className="rounded-xl border border-dashed border-[var(--fc-line2)] p-5 text-center text-[13px] text-fc-muted">
          هنوز تست آنالیزی ثبت نشده. بعد از اولین تست، ترکیب بدنتان اینجا می‌آید.
        </p>
      ) : (
        <>
          <p className="mb-3 text-[12px] text-fc-dim">
            آخرین تست: {faDate(latest.measured_on)}
            {previous && <> · مقایسه با {faDate(previous.measured_on)}</>}
          </p>
          <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {FIELDS.filter(([k]) => latest[k] !== null).map(([k, label, unit, good]) => {
              const now = n(latest[k] as number | null)!;
              const before = previous ? n(previous[k] as number | null) : null;
              const delta = before === null ? null : Math.round((now - before) * 10) / 10;
              const better = delta === null || delta === 0 || good === null ? null : (delta > 0) === (good === "up");
              return (
                <div key={k} className="rounded-xl bg-fc-navy2/40 px-3 py-2.5">
                  <dt className="text-[11.5px] text-fc-muted">{label}</dt>
                  <dd className="mt-0.5 flex items-baseline gap-1">
                    <b className="fc-num text-[17px] font-extrabold">{faDigits(now)}</b>
                    {unit && <small className="text-[11px] text-fc-muted">{unit}</small>}
                    {delta !== null && delta !== 0 && (
                      <span
                        className={`ms-auto flex items-center text-[11px] font-bold ${
                          better === null ? "text-fc-muted" : better ? "text-fc-ok" : "text-fc-bad"
                        }`}
                      >
                        {delta > 0 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                        {faDigits(Math.abs(delta))}
                      </span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
          {rows.length > 2 && (
            <p className="mt-3 text-[11.5px] text-fc-dim">
              {faDigits(rows.length)} تست ثبت شده است. روند کامل در صفحه‌ی پیشرفت.
            </p>
          )}
        </>
      )}
    </section>
  );
}
