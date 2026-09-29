"use client";

import { useMemo, useState } from "react";
import { Calculator, CircleHelp, Sparkles, Utensils } from "lucide-react";
import { estimateMeal, CONFIDENCE_LABEL } from "@/lib/food-estimate";
import { faDigits, faNumber } from "@/lib/format";

/** Something to press when the box is empty. Nobody types a full meal
 *  into a blank field to find out whether a feature works. */
const EXAMPLES = [
  "۲ عدد تخم مرغ با یک کف دست نان سنگک و نصف لیوان شیر",
  "۱ سیخ جوجه کباب، ۳۰۰ گرم برنج، سالاد شیرازی، یک لیوان دوغ",
  "یک اسکوپ پودر پروتئین با یک موز",
  "۱۵۰ گرم سینه مرغ و دو قاشق روغن زیتون",
];

const CONFIDENCE_STYLE: Record<string, string> = {
  high: "fc-chip-ok",
  medium: "fc-chip-cy",
  low: "fc-chip-warn",
};

export function CalorieEstimator({
  /** The member's own daily target, so the answer lands in context
   *  instead of being a number floating on its own. */
  dailyTarget = null,
}: {
  dailyTarget?: number | null;
}) {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState("");

  // Pure arithmetic over a table in the bundle — no request to wait on,
  // so there is no spinner and no failure state to design for.
  const result = useMemo(() => estimateMeal(submitted), [submitted]);

  const show = submitted.trim().length > 0;
  const low = Math.round(result.kcal * (1 - result.spread));
  const high = Math.round(result.kcal * (1 + result.spread));
  const share = dailyTarget ? Math.min(100, (result.kcal / dailyTarget) * 100) : null;

  return (
    <>
      <section className="fc-raised p-5">
        <h2 className="mb-1 flex items-center gap-2 text-[14.5px]">
          <Sparkles className="size-4 text-fc-cyan" />
          محاسبه‌گر هوشمند کالری
        </h2>
        <p className="mb-4 text-[12.5px] leading-relaxed text-fc-muted">
          هرچه خوردید را همان‌طور که حرف می‌زنید بنویسید — «دو تا تخم‌مرغ با یک
          کف دست نان سنگک». مقدار، واحد و نوع غذا را خودش می‌خواند و کالری و
          درشت‌مغذی‌ها را حساب می‌کند.
        </p>

        <label htmlFor="meal" className="mb-2 block text-[13px] font-bold">
          چه چیزی خوردید؟
        </label>
        <textarea
          id="meal"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter submits, Shift+Enter keeps writing. A meal is
            // usually one line, so making Enter mean "newline" would
            // add a step to every single use.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              setSubmitted(text);
            }
          }}
          placeholder="مثلاً: ۱۵۰ گرم سینه مرغ، یک لیوان برنج، سالاد شیرازی"
          className="fc-input resize-y"
          style={{ fontSize: 16 }}
        />

        <button
          type="button"
          onClick={() => setSubmitted(text)}
          disabled={text.trim().length === 0}
          className="fc-btn mt-3 w-full"
        >
          <Calculator className="size-[18px]" />
          حساب کن
        </button>

        {!show && (
          <div className="mt-4">
            <p className="mb-2 text-[11.5px] text-fc-dim">یا یکی از این‌ها را امتحان کنید:</p>
            <ul className="flex list-none flex-wrap gap-2 p-0">
              {EXAMPLES.map((example) => (
                <li key={example}>
                  <button
                    type="button"
                    onClick={() => {
                      setText(example);
                      setSubmitted(example);
                    }}
                    className="fc-chip text-start transition-colors hover:text-fc-cyan"
                  >
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {show && result.items.length === 0 && (
        <section className="fc-card mt-3.5 p-5">
          <h3 className="mb-2 flex items-center gap-2 text-[14px]">
            <CircleHelp className="size-4 text-fc-warn" />
            هیچ‌کدام را نشناختم
          </h3>
          <p className="text-[12.5px] leading-relaxed text-fc-muted">
            اسم غذا را ساده‌تر بنویسید — «مرغ» به جای «فیله مرغ گریل‌شده با
            سس». اگر باز هم نشناخت، کالری‌اش در جدول این اپ نیست و باید دستی
            ثبتش کنید.
          </p>
        </section>
      )}

      {show && result.items.length > 0 && (
        <>
          <section className="fc-raised mt-3.5 p-5">
            <div className="flex items-start gap-2">
              <h3 className="flex-1 text-[14.5px]">نتیجه</h3>
              <span className={`fc-chip shrink-0 ${CONFIDENCE_STYLE[result.confidence]}`}>
                {CONFIDENCE_LABEL[result.confidence]}
              </span>
            </div>

            <p className="mt-3 text-center">
              <b className="fc-lat fc-num block text-[34px] leading-none font-extrabold text-fc-ok">
                {faNumber(result.kcal)}
              </b>
              <small className="mt-1.5 block text-[11.5px] text-fc-dim">
                کالری — بین {faNumber(low)} تا {faNumber(high)}
              </small>
            </p>

            {share !== null && (
              <div className="mt-4">
                <div className="mb-1.5 flex items-baseline justify-between text-[12px]">
                  <span className="text-fc-muted">از هدف روزانه‌ی شما</span>
                  <b className="fc-lat fc-num text-[13px]">
                    {faDigits(Math.round(share))}٪
                  </b>
                </div>
                <div
                  role="img"
                  aria-label={`${Math.round(share)} درصد از هدف روزانه`}
                  className="h-2 overflow-hidden rounded-full bg-fc-navy2/60"
                >
                  <div
                    className="h-full rounded-full bg-fc-ok"
                    style={{ width: `${share}%` }}
                  />
                </div>
              </div>
            )}

            <div className="mt-4 grid grid-cols-3 gap-2.5">
              {(
                [
                  ["پروتئین", result.protein, "#00b2e3"],
                  ["کربوهیدرات", result.carb, "#f5b942"],
                  ["چربی", result.fat, "#2ed3a7"],
                ] as const
              ).map(([label, grams, color]) => (
                <div key={label} className="fc-card px-2 py-3 text-center">
                  <b
                    className="fc-lat fc-num block text-base font-extrabold"
                    style={{ color }}
                  >
                    {faDigits(grams)}
                  </b>
                  <small className="text-[10.5px] text-fc-dim">{label} (گرم)</small>
                </div>
              ))}
            </div>
          </section>

          <h3 className="mt-5 mb-3 flex items-center gap-2 text-[14px]">
            <Utensils className="size-4 text-fc-cyan" />
            چطور حساب شد
          </h3>
          <ul className="grid list-none gap-2 p-0">
            {result.items.map((item, index) => (
              <li
                key={`${item.food.id}-${index}`}
                className="fc-card flex items-center gap-3 p-3"
              >
                <div className="min-w-0 flex-1">
                  <b className="block text-[13px]">{item.food.name}</b>
                  <small className="text-[11px] text-fc-dim">
                    {faDigits(item.grams)} گرم
                    {item.basis === "assumed" && " · مقدار را حدس زدم"}
                    {item.match === "fuzzy" && " · شبیه‌ترین چیزی که پیدا کردم"}
                  </small>
                </div>
                <span className="fc-lat fc-num shrink-0 text-[13px] font-extrabold text-fc-muted">
                  {faNumber(item.kcal)}
                </span>
              </li>
            ))}
          </ul>

          {result.unknown.length > 0 && (
            <div className="fc-card mt-3 p-3.5">
              <p className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-fc-warn">
                <CircleHelp className="size-3.5" />
                این‌ها را نشناختم و در جمع نیامده‌اند
              </p>
              <ul className="flex list-none flex-wrap gap-1.5 p-0">
                {result.unknown.map((phrase, index) => (
                  <li key={`${phrase}-${index}`} className="fc-chip">
                    {phrase}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-4 text-[11.5px] leading-relaxed text-fc-dim">
            این عدد یک برآورد است، نه اندازه‌گیری. جدول غذایی بر پایه‌ی مقدار
            متوسط هر غذاست و اندازه‌ی واقعی بشقاب و میزان روغن، هر وعده را تا
            یک‌سوم بالا و پایین می‌برد. برای تصمیم‌های جدی با مربی‌تان چک کنید.
          </p>
        </>
      )}
    </>
  );
}
