"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { saveDiet } from "@/app/coach/actions";
import { faNumber } from "@/lib/format";
import type { MacroTarget } from "@/lib/nutrition";

export interface DraftMeal {
  key: string;
  name: string;
  time: string;
  items: string;
  kcal: number | null;
}

interface Target {
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
}

let counter = 0;
const nextKey = () => `meal-${counter++}`;

/** The shape of an Iranian training day — offered so the coach fills in
 *  food rather than retyping the same five headings for every member. */
const SKELETON = [
  { name: "صبحانه", time: "07:30" },
  { name: "میان‌وعده", time: "10:30" },
  { name: "ناهار", time: "13:30" },
  { name: "قبل تمرین", time: "17:00" },
  { name: "شام", time: "21:00" },
];

export function DietBuilder({
  studentId,
  computed,
  initialMeals,
  previousTarget,
}: {
  studentId: string;
  computed: MacroTarget | null;
  initialMeals: DraftMeal[];
  previousTarget: Target | null;
}) {
  const fallback: Target = computed ??
    previousTarget ?? { kcal: 2000, proteinG: 140, carbG: 220, fatG: 60 };

  const [target, setTarget] = useState<Target>(fallback);
  const [meals, setMeals] = useState<DraftMeal[]>(
    initialMeals.length > 0
      ? initialMeals
      : SKELETON.map((m) => ({ key: nextKey(), ...m, items: "", kcal: null }))
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // `ai_generated` on the plan means "these macros are the calculator's,
  // untouched" — it drives the badge the member sees, so it has to be
  // false the moment a coach types over any of the four numbers.
  const fromCalculator =
    computed !== null &&
    target.kcal === computed.kcal &&
    target.proteinG === computed.proteinG &&
    target.carbG === computed.carbG &&
    target.fatG === computed.fatG;

  const plannedKcal = meals.reduce((sum, m) => sum + (m.kcal ?? 0), 0);

  function patchMeal(key: string, change: Partial<DraftMeal>) {
    setMeals((prev) => prev.map((m) => (m.key === key ? { ...m, ...change } : m)));
    setSaved(false);
  }

  function submit(publish: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await saveDiet(studentId, {
        ...target,
        fromCalculator,
        meals: meals.map(({ name, time, items, kcal }) => ({
          name,
          time,
          items,
          kcal,
        })),
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

  return (
    <>
      <section className="fc-raised p-5">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="flex-1 text-[14.5px]">هدف روزانه</h2>
          {fromCalculator && (
            <span className="fc-chip fc-chip-cy shrink-0">
              <Sparkles className="size-3.5" />
              محاسبه‌ی خودکار
            </span>
          )}
          {computed && !fromCalculator && (
            <button
              type="button"
              onClick={() => {
                setTarget(computed);
                setSaved(false);
              }}
              className="fc-chip shrink-0 transition-colors hover:text-fc-cyan"
            >
              <RotateCcw className="size-3.5" />
              بازگشت به عدد محاسبه‌شده
            </button>
          )}
        </div>

        <p className="mb-4 text-[12.5px] leading-relaxed text-fc-muted">
          {computed
            ? `از روی قد، وزن، سن و سطح فعالیت حساب شده — سوخت‌وساز پایه ${faNumber(
                computed.bmr
              )} کالری. اگر لازم بود دستی تغییرش بدهید.`
            : "مشخصات بدنی این شاگرد کامل نیست، پس محاسبه‌ی خودکار ممکن نشد. اعداد را دستی بنویسید."}
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["کالری", "kcal", 800, 6000],
              ["پروتئین (گرم)", "proteinG", 0, 500],
              ["کربوهیدرات (گرم)", "carbG", 0, 1000],
              ["چربی (گرم)", "fatG", 0, 300],
            ] as const
          ).map(([label, field, min, max]) => (
            <div key={field}>
              <label
                htmlFor={`t-${field}`}
                className="mb-1 block text-[11px] text-fc-dim"
              >
                {label}
              </label>
              <input
                id={`t-${field}`}
                type="number"
                inputMode="numeric"
                min={min}
                max={max}
                value={target[field]}
                onChange={(e) => {
                  setTarget((prev) => ({ ...prev, [field]: Number(e.target.value) }));
                  setSaved(false);
                }}
                className="fc-lat w-full rounded-lg border border-[var(--fc-line2)] bg-fc-ink px-2 py-1.5 text-center font-extrabold focus:border-fc-cyan focus:outline-none"
                style={{ minHeight: 44, fontSize: 16 }}
              />
            </div>
          ))}
        </div>
      </section>

      <h2 className="mt-6 mb-3 flex items-center gap-2 text-[14.5px]">
        وعده‌ها
        <span
          className={`fc-chip fc-num ms-auto ${
            plannedKcal > target.kcal + 100 ? "fc-chip-warn" : ""
          }`}
        >
          {faNumber(plannedKcal)} از {faNumber(target.kcal)}
        </span>
      </h2>

      <ul className="grid list-none gap-2.5 p-0">
        {meals.map((meal) => (
          <li key={meal.key} className="fc-card p-3.5">
            <div className="flex items-center gap-2">
              <input
                value={meal.name}
                onChange={(e) => patchMeal(meal.key, { name: e.target.value })}
                placeholder="نام وعده"
                aria-label="نام وعده"
                className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1 py-1 font-extrabold focus:border-fc-cyan focus:outline-none"
                style={{ fontSize: 16 }}
              />
              <input
                type="time"
                value={meal.time}
                onChange={(e) => patchMeal(meal.key, { time: e.target.value })}
                aria-label={`ساعت ${meal.name || "وعده"}`}
                className="fc-lat shrink-0 rounded-lg border border-[var(--fc-line2)] bg-fc-ink px-2 py-1 text-center text-xs font-bold focus:border-fc-cyan focus:outline-none"
                style={{ minHeight: 36, fontSize: 16 }}
              />
              <button
                type="button"
                onClick={() => {
                  setMeals((prev) => prev.filter((m) => m.key !== meal.key));
                  setSaved(false);
                }}
                aria-label={`حذف ${meal.name || "وعده"}`}
                className="grid size-9 shrink-0 place-items-center rounded-lg text-fc-dim transition-colors hover:text-fc-bad"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            <textarea
              value={meal.items}
              onChange={(e) => patchMeal(meal.key, { items: e.target.value })}
              rows={2}
              placeholder="مثلاً ۴ عدد تخم‌مرغ آب‌پز، ۲ کف دست نان سنگک، ۳۰ گرم پنیر"
              aria-label={`محتوای ${meal.name || "وعده"}`}
              className="fc-input mt-2 resize-y"
              style={{ fontSize: 16 }}
            />

            <div className="mt-2 flex items-center gap-2">
              <label
                htmlFor={`kcal-${meal.key}`}
                className="text-[11.5px] text-fc-dim"
              >
                کالری این وعده
              </label>
              <input
                id={`kcal-${meal.key}`}
                type="number"
                inputMode="numeric"
                min={0}
                max={3000}
                value={meal.kcal ?? ""}
                placeholder="—"
                onChange={(e) =>
                  patchMeal(meal.key, {
                    kcal: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                className="fc-lat w-20 rounded-lg border border-[var(--fc-line2)] bg-fc-ink px-2 py-1 text-center text-xs font-bold focus:border-fc-cyan focus:outline-none"
                style={{ minHeight: 34, fontSize: 16 }}
              />
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => {
          setMeals((prev) => [
            ...prev,
            { key: nextKey(), name: "", time: "", items: "", kcal: null },
          ]);
          setSaved(false);
        }}
        className="fc-btn fc-btn-ghost mt-3 w-full"
      >
        <Plus className="size-[18px]" />
        افزودن وعده
      </button>

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
