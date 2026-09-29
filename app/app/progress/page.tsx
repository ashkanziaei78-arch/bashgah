import Link from "next/link";
import {
  Activity,
  ChevronLeft,
  Dumbbell,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, one } from "@/lib/data";
import { faDate, faDigits, faNumber, todayInTehran } from "@/lib/format";
import { GOAL_LABEL } from "@/lib/nutrition";
import { WeightChart, type WeightPoint } from "@/components/progress/weight-chart";
import { WeightLogger } from "@/components/progress/weight-logger";

export const metadata = { title: "پیشرفت" };

interface MetricRow {
  measured_on: string;
  source: "self" | "analyzer" | "coach";
  weight_kg: number | null;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  body_water_pct: number | null;
  bone_mass_kg: number | null;
  visceral_fat: number | null;
  metabolic_age: number | null;
  bmr_kcal: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  hip_cm: number | null;
  neck_cm: number | null;
  note: string | null;
}

/** An embedded relation as PostgREST may hand it back: the row, a list
 *  of rows, or nothing. `one()` collapses all three. */
type Rel<T> = T | T[] | null;

const SOURCE_LABEL: Record<MetricRow["source"], string> = {
  self: "ثبت خودتان",
  analyzer: "آنالیز بدنی باشگاه",
  coach: "اندازه‌گیری مربی",
};

/** A change, said in words as well as colour.
 *
 *  Whether down is good depends on what the member is training for, so
 *  the verdict is read off their goal rather than assumed. The arrow
 *  and the sentence carry the meaning on their own — the colour only
 *  reinforces it, because colour alone is not an encoding.
 */
function verdict(delta: number, goal: "lose" | "gain" | "maintain") {
  if (Math.abs(delta) < 0.15) {
    return { tone: "text-fc-muted", Icon: Minus, word: "بدون تغییر" };
  }
  const down = delta < 0;
  const good = goal === "lose" ? down : goal === "gain" ? !down : false;
  return {
    tone: good ? "text-fc-ok" : goal === "maintain" ? "text-fc-muted" : "text-fc-warn",
    Icon: down ? TrendingDown : TrendingUp,
    word: `${faDigits(Math.abs(Math.round(delta * 10) / 10))} کیلو ${down ? "کم" : "اضافه"} شده`,
  };
}

export default async function Progress() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const today = todayInTehran();

  const [{ data: metrics }, { data: logs }] = await Promise.all([
    supabase
      .from("body_metrics")
      .select(
        `measured_on, source, weight_kg, body_fat_pct, muscle_mass_kg, body_water_pct,
         bone_mass_kg, visceral_fat, metabolic_age, bmr_kcal,
         waist_cm, chest_cm, arm_cm, thigh_cm, hip_cm, neck_cm, note`
      )
      .eq("student_id", profile.id)
      .order("measured_on", { ascending: true }),
    supabase
      .from("workout_logs")
      .select("performed_on, weight_kg, program_items(exercises(name))")
      .eq("student_id", profile.id)
      .not("weight_kg", "is", null)
      .order("performed_on", { ascending: true }),
  ]);

  const rows = (metrics ?? []) as MetricRow[];
  const goal = (profile.goal ?? "maintain") as "lose" | "gain" | "maintain";

  // ---------- weight ----------
  const weighIns: WeightPoint[] = rows
    .filter((r) => r.weight_kg !== null)
    .map((r) => ({ on: r.measured_on, value: Number(r.weight_kg) }));

  const first = weighIns[0] ?? null;
  const latest = weighIns[weighIns.length - 1] ?? null;
  const previous = weighIns.length > 1 ? weighIns[weighIns.length - 2] : null;
  const change = first && latest ? latest.value - first.value : null;

  const todaysSelf =
    rows.find((r) => r.measured_on === today && r.source === "self")?.weight_kg ?? null;

  // ---------- body composition ----------
  // Sparse by nature — a gym runs the analyser every month or two. Two
  // readings do not make a chart worth drawing, so the latest is shown
  // as figures with the change since the test before it.
  const analyses = rows.filter((r) => r.source === "analyzer");
  const scan = analyses[analyses.length - 1] ?? null;
  const priorScan = analyses.length > 1 ? analyses[analyses.length - 2] : null;

  const COMPOSITION: [string, keyof MetricRow, string, number][] = [
    ["چربی بدن", "body_fat_pct", "٪", 1],
    ["توده‌ی عضلانی", "muscle_mass_kg", "کیلو", 1],
    ["آب بدن", "body_water_pct", "٪", 1],
    ["چربی احشایی", "visceral_fat", "", 0],
    ["سن متابولیک", "metabolic_age", "سال", 0],
    ["سوخت‌وساز پایه", "bmr_kcal", "کالری", 0],
  ];

  const GIRTHS: [string, keyof MetricRow][] = [
    ["سینه", "chest_cm"],
    ["بازو", "arm_cm"],
    ["کمر", "waist_cm"],
    ["باسن", "hip_cm"],
    ["ران", "thigh_cm"],
    ["گردن", "neck_cm"],
  ];

  // ---------- strength ----------
  // The weights are already in workout_logs; nothing had ever read them
  // back. First lift against heaviest lift is the whole story.
  const byExercise = new Map<string, { first: number; best: number; on: string }>();

  // `workout_logs.program_item_id` is a to-one foreign key, so PostgREST
  // returns an object — but the generated types are still a placeholder
  // (`Database = any`), so the client guesses an array. `one()` copes
  // with either at runtime; the cast has to go through `unknown`
  // because the two guesses do not overlap at compile time.
  type LogRow = {
    performed_on: string;
    weight_kg: number;
    program_items: Rel<{ exercises: Rel<{ name: string }> }>;
  };

  for (const log of (logs ?? []) as unknown as LogRow[]) {
    const name = one(one(log.program_items)?.exercises ?? null)?.name;
    if (!name) continue;
    const kg = Number(log.weight_kg);
    const seen = byExercise.get(name);
    if (!seen) {
      byExercise.set(name, { first: kg, best: kg, on: log.performed_on });
    } else if (kg >= seen.best) {
      byExercise.set(name, { ...seen, best: kg, on: log.performed_on });
    }
  }

  const lifts = [...byExercise.entries()]
    .map(([name, v]) => ({ name, ...v, gain: v.best - v.first }))
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 6);

  const nothingYet = weighIns.length === 0 && analyses.length === 0 && lifts.length === 0;

  return (
    <>
      <header className="flex items-center gap-3 pt-5 pb-3.5">
        <Link
          href="/app"
          aria-label="بازگشت به خانه"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-fc-dim hover:text-fc-text"
        >
          <ChevronLeft className="size-5 rotate-180" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg">پیشرفت</h1>
          <p className="text-xs text-fc-dim">هدف: {GOAL_LABEL[goal]}</p>
        </div>
      </header>

      {latest && (
        <section className="fc-raised p-5">
          <small className="text-[12px] text-fc-muted">وزن فعلی</small>
          <b className="fc-lat fc-num mt-1 block text-[30px] leading-none font-extrabold text-fc-text">
            {faDigits(latest.value)}
            <span className="ms-1.5 text-[14px] font-bold text-fc-dim">کیلوگرم</span>
          </b>

          {change !== null && weighIns.length > 1 && (
            <p
              className={`mt-2.5 flex items-center gap-1.5 text-[13px] font-bold ${verdict(change, goal).tone}`}
            >
              {(() => {
                const { Icon } = verdict(change, goal);
                return <Icon className="size-4" />;
              })()}
              {verdict(change, goal).word} از {faDate(first!.on)}
            </p>
          )}

          {previous && (
            <p className="mt-1 text-[11.5px] text-fc-dim">
              نسبت به دفعه‌ی قبل ({faDate(previous.on)}):{" "}
              <span className="fc-num">
                {latest.value === previous.value
                  ? "بدون تغییر"
                  : `${faDigits(Math.abs(Math.round((latest.value - previous.value) * 10) / 10))} کیلو ${latest.value < previous.value ? "کمتر" : "بیشتر"}`}
              </span>
            </p>
          )}

          {weighIns.length > 1 && (
            <div className="mt-4">
              <WeightChart points={weighIns} />
            </div>
          )}

          {weighIns.length === 1 && (
            <p className="mt-3 text-[12px] leading-relaxed text-fc-muted">
              یک اندازه‌گیری هنوز نمودار نمی‌سازد. دفعه‌ی بعد که وزن کردید ثبتش
              کنید تا خط پیشرفت شکل بگیرد.
            </p>
          )}
        </section>
      )}

      <div className="mt-3.5">
        <WeightLogger today={today} current={todaysSelf === null ? null : Number(todaysSelf)} />
      </div>

      {scan && (
        <>
          <h2 className="mt-6 mb-1 flex items-center gap-2 text-[14.5px]">
            <Activity className="size-4 text-fc-cyan" />
            آنالیز بدنی باشگاه
          </h2>
          <p className="mb-3 text-[11.5px] text-fc-dim">
            آخرین تست: {faDate(scan.measured_on)}
            {priorScan && ` · مقایسه با ${faDate(priorScan.measured_on)}`}
          </p>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {COMPOSITION.filter((c) => scan[c[1]] !== null).map(
              ([label, key, unit, decimals]) => {
                const now = Number(scan[key]);
                const before = priorScan?.[key] ?? null;
                const diff = before === null ? null : now - Number(before);

                return (
                  <div key={key as string} className="fc-card px-3 py-3.5">
                    <small className="block text-[11px] text-fc-dim">{label}</small>
                    <b className="fc-lat fc-num mt-1 block text-[18px] font-extrabold text-fc-text">
                      {faDigits(decimals === 0 ? Math.round(now) : now.toFixed(1))}
                      {unit && (
                        <span className="ms-1 text-[11px] font-bold text-fc-dim">{unit}</span>
                      )}
                    </b>
                    {diff !== null && Math.abs(diff) >= 0.05 && (
                      <small className="fc-num mt-0.5 block text-[10.5px] text-fc-muted">
                        {diff > 0 ? "+" : "−"}
                        {faDigits(
                          decimals === 0
                            ? Math.abs(Math.round(diff))
                            : Math.abs(diff).toFixed(1)
                        )}{" "}
                        نسبت به قبل
                      </small>
                    )}
                  </div>
                );
              }
            )}
          </div>

          {GIRTHS.some(([, key]) => scan[key] !== null) && (
            <>
              <h3 className="mt-5 mb-2.5 text-[13.5px]">دورهای بدن (سانتی‌متر)</h3>
              <ul className="grid list-none gap-2 p-0">
                {GIRTHS.filter(([, key]) => scan[key] !== null).map(([label, key]) => {
                  const now = Number(scan[key]);
                  const before = priorScan?.[key] ?? null;
                  const diff = before === null ? null : now - Number(before);
                  return (
                    <li
                      key={key as string}
                      className="fc-card flex items-center gap-3 px-3.5 py-2.5"
                    >
                      <span className="min-w-0 flex-1 text-[13px]">{label}</span>
                      {diff !== null && Math.abs(diff) >= 0.05 && (
                        <span className="fc-num shrink-0 text-[11px] text-fc-muted">
                          {diff > 0 ? "+" : "−"}
                          {faDigits(Math.abs(diff).toFixed(1))}
                        </span>
                      )}
                      <b className="fc-lat fc-num shrink-0 text-[14px] font-extrabold">
                        {faDigits(now.toFixed(1))}
                      </b>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {scan.note && (
            <p className="fc-card mt-3 p-3.5 text-[12.5px] leading-relaxed text-fc-muted">
              «{scan.note}»
            </p>
          )}
        </>
      )}

      {lifts.length > 0 && (
        <>
          <h2 className="mt-6 mb-1 flex items-center gap-2 text-[14.5px]">
            <Dumbbell className="size-4 text-fc-cyan" />
            رکوردهای تمرینی
          </h2>
          <p className="mb-3 text-[11.5px] text-fc-dim">
            سنگین‌ترین وزنه‌ای که زده‌اید، در برابر اولین باری که همان حرکت را ثبت کردید
          </p>
          <ul className="grid list-none gap-2 p-0">
            {lifts.map((lift) => (
              <li key={lift.name} className="fc-card flex items-center gap-3 p-3.5">
                <span className="min-w-0 flex-1">
                  <b className="block text-[13px]">{lift.name}</b>
                  <small className="fc-num text-[11px] text-fc-dim">
                    از {faDigits(lift.first)} کیلو · {faDate(lift.on)}
                  </small>
                </span>
                {lift.gain > 0 && (
                  <span className="fc-chip fc-chip-ok fc-num shrink-0">
                    +{faDigits(Math.round(lift.gain * 10) / 10)}
                  </span>
                )}
                <b className="fc-lat fc-num shrink-0 text-[15px] font-extrabold">
                  {faDigits(lift.best)}
                </b>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* The table view. Every value drawn above is also readable here
          as text, which is what keeps the chart from being the only way
          to get at the numbers. */}
      {rows.length > 0 && (
        <>
          <h2 className="mt-6 mb-3 text-[14.5px]">همه‌ی اندازه‌گیری‌ها</h2>
          <ul className="grid list-none gap-2 p-0">
            {[...rows].reverse().map((r) => (
              <li
                key={`${r.measured_on}-${r.source}`}
                className="fc-card flex items-center gap-3 px-3.5 py-2.5"
              >
                <span className="min-w-0 flex-1">
                  <b className="fc-num block text-[12.5px]">{faDate(r.measured_on)}</b>
                  <small className="text-[10.5px] text-fc-dim">{SOURCE_LABEL[r.source]}</small>
                </span>
                {r.body_fat_pct !== null && (
                  <span className="fc-num shrink-0 text-[11px] text-fc-muted">
                    {faDigits(Number(r.body_fat_pct).toFixed(1))}٪ چربی
                  </span>
                )}
                {r.weight_kg !== null && (
                  <b className="fc-lat fc-num shrink-0 text-[14px] font-extrabold">
                    {faDigits(Number(r.weight_kg))}
                  </b>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {nothingYet && (
        <div className="fc-card mt-4 p-5">
          <h2 className="mb-2 text-base">هنوز چیزی برای نشان دادن نیست</h2>
          <p className="text-[13px] leading-relaxed text-fc-muted">
            اولین وزنتان را بالا ثبت کنید. بعد از دومین ثبت، نمودار پیشرفت شکل
            می‌گیرد. اگر باشگاه برایتان آنالیز بدنی بگیرد، نتیجه‌اش هم همین‌جا
            می‌آید — و وزنه‌هایی که سر تمرین ثبت می‌کنید خودشان تبدیل به رکورد
            می‌شوند.
          </p>
        </div>
      )}

      {weighIns.length > 2 && (
        <p className="mt-4 text-[11.5px] leading-relaxed text-fc-dim">
          وزن در طول روز تا{" "}
          <span className="fc-num">{faNumber(2)}</span> کیلو بالا و پایین می‌رود.
          برای اینکه نمودار معنی بدهد، همیشه یک زمان ثابت را انتخاب کنید — صبح،
          ناشتا، قبل از صبحانه.
        </p>
      )}

      <div className="h-6" />
    </>
  );
}
