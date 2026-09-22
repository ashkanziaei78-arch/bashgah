"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Home,
  Dumbbell,
  Apple,
  LineChart,
  ChevronLeft,
  FlaskConical,
  Sparkles,
  Flame,
} from "lucide-react";
import { ExerciseList } from "@/components/exercise-list";
import { SessionRing } from "@/components/session-ring";
import { ProgressView } from "@/components/progress-view";
import {
  SectionHeading,
  WeekStrip,
  StreakChip,
  StatRow,
  streakFrom,
} from "@/components/ui";
import { faDigits, faNumber } from "@/lib/format";
import {
  DEMO_NAME,
  DEMO_MEMBERSHIP,
  DEMO_ROWS,
  DEMO_SERIES,
  DEMO_WEEKS,
  DEMO_TOTALS,
  DEMO_ATTENDED,
  DEMO_TODAY_INDEX,
  DEMO_DIET,
} from "@/lib/demo-data";

const TABS = [
  { id: "home", label: "خانه", icon: Home },
  { id: "workout", label: "تمرین", icon: Dumbbell },
  { id: "nutrition", label: "تغذیه", icon: Apple },
  { id: "progress", label: "پیشرفت", icon: LineChart },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** The member app, driven by fixtures instead of an account.
 *
 *  It mounts the same components the signed-in app does — the same
 *  exercise list, rest timer, rings, strips and charts — so it cannot
 *  quietly become a prettier mock-up of a product that does not behave
 *  this way. Only the data source differs, and writes are off. */
export function DemoApp() {
  const [tab, setTab] = useState<TabId>("home");
  const streak = streakFrom(DEMO_ATTENDED, DEMO_TODAY_INDEX);
  const { plan, sessionsTotal, sessionsUsed, daysLeft } = DEMO_MEMBERSHIP;
  const left = sessionsTotal - sessionsUsed;

  return (
    <div className="flex min-h-dvh flex-col">
      <p className="fc-demo-bar">
        <FlaskConical className="size-4 shrink-0" aria-hidden />
        نسخه‌ی نمایشی — داده‌ها ساختگی است و چیزی ذخیره نمی‌شود.
        <Link href="/" className="underline underline-offset-2">
          بازگشت به سایت
        </Link>
      </p>

      <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-5">
        {tab === "home" && (
          <>
            <header className="flex items-center gap-3.5 pt-6 pb-4">
              <div className="fc-avatar size-11 text-sm" aria-hidden>
                ات
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl">سلام {DEMO_NAME.split(" ")[0]}</h1>
                <p className="text-xs text-fc-dim">چهارشنبه، ۱۰ شهریور ۱۴۰۵</p>
              </div>
            </header>

            <section className="fc-hero fc-rise flex items-center gap-5 p-5">
              <SessionRing left={left} total={sessionsTotal} />
              <dl className="grid min-w-0 flex-1 gap-3">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <dt className="text-fc-muted">اشتراک</dt>
                  <dd className="truncate font-extrabold">{plan}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <dt className="text-fc-muted">روز باقی‌مانده</dt>
                  <dd className="fc-num text-md">{faDigits(daysLeft)} روز</dd>
                </div>
                <div className="grid gap-2">
                  <div className="fc-bar">
                    <i style={{ width: `${(sessionsUsed / sessionsTotal) * 100}%` }} />
                  </div>
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <dt className="text-fc-muted">مصرف‌شده</dt>
                    <dd className="fc-num text-sm">
                      {faDigits(sessionsUsed)} از {faDigits(sessionsTotal)}
                    </dd>
                  </div>
                </div>
              </dl>
            </section>

            <SectionHeading>تمرین امروز</SectionHeading>
            <button
              type="button"
              onClick={() => setTab("workout")}
              className="fc-card fc-card-link fc-rise flex w-full items-center gap-3.5 p-4 text-start"
            >
              <span className="grid size-13 shrink-0 place-items-center rounded-2xl border border-[var(--fc-line2)] bg-fc-navy2/60 text-fc-cyan">
                <Dumbbell className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-md">سینه و جلوبازو</b>
                <small className="text-xs text-fc-dim">
                  <span className="fc-num">{faDigits(DEMO_ROWS.length)}</span> حرکت
                </small>
              </span>
              <ChevronLeft className="size-5 text-fc-dim" aria-hidden />
            </button>

            <SectionHeading>برنامه غذایی</SectionHeading>
            <button
              type="button"
              onClick={() => setTab("nutrition")}
              className="fc-card fc-card-link fc-rise flex w-full items-center gap-3.5 p-4 text-start"
            >
              <span className="grid size-13 shrink-0 place-items-center rounded-2xl border border-[var(--fc-line2)] bg-fc-navy2/60 text-fc-ok">
                <Apple className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block text-md">
                  <span className="fc-num">{faNumber(DEMO_DIET.kcal)}</span> کالری هدف
                </b>
                <small className="text-xs text-fc-dim">
                  <span className="fc-num">{faDigits(DEMO_DIET.meals.length)}</span> وعده
                </small>
              </span>
              <ChevronLeft className="size-5 text-fc-dim" aria-hidden />
            </button>

            <div className="fc-shead">
              هفته‌ی اخیر
              <StreakChip days={streak} />
            </div>
            <WeekStrip attended={DEMO_ATTENDED} todayIndex={DEMO_TODAY_INDEX} />
            <p className="mt-2.5 flex items-center gap-1.5 text-xs text-fc-dim">
              <Flame className="size-3.5 text-fc-warn" aria-hidden />
              این هفته <span className="fc-num">{faDigits(DEMO_ATTENDED.size)}</span> جلسه
              تمرین کرده‌اید.
            </p>
          </>
        )}

        {tab === "workout" && (
          <>
            <header className="pt-6 pb-4">
              <h1 className="text-xl">سینه و جلوبازو</h1>
              <p className="text-xs text-fc-dim">نوشته‌ی علی رضایی · ۸ شهریور ۱۴۰۵</p>
            </header>
            {/* persist={false}: the demo has no account to write to. */}
            <ExerciseList
              rows={DEMO_ROWS}
              studentId="demo"
              today="1405-06-10"
              persist={false}
            />
          </>
        )}

        {tab === "nutrition" && (
          <>
            <header className="flex items-start gap-3 pt-6 pb-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl">برنامه غذایی</h1>
                <p className="text-xs text-fc-dim">بازبینی زهرا کریمی · ۱ شهریور ۱۴۰۵</p>
              </div>
              <span className="fc-chip fc-chip-cy shrink-0">
                <Sparkles className="size-3.5" aria-hidden />
                محاسبه‌ی هوشمند
              </span>
            </header>

            <section className="fc-hero fc-rise flex items-center gap-5 p-5">
              <SessionRing
                left={DEMO_DIET.meals.reduce((s, m) => s + m.kcal, 0)}
                total={DEMO_DIET.kcal}
                label="کالری"
                tone="ok"
              />
              <dl className="grid min-w-0 flex-1 gap-3">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <dt className="text-fc-muted">هدف روزانه</dt>
                  <dd className="fc-num text-md">{faNumber(DEMO_DIET.kcal)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <dt className="text-fc-muted">هدف بدنی</dt>
                  <dd className="font-extrabold">افزایش حجم</dd>
                </div>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <dt className="text-fc-muted">وزن فعلی</dt>
                  <dd className="fc-num text-md">{faDigits(78)} کیلو</dd>
                </div>
              </dl>
            </section>

            <StatRow
              stats={[
                { label: "پروتئین (گرم)", value: faDigits(DEMO_DIET.proteinG), tone: "cyan" },
                { label: "کربوهیدرات (گرم)", value: faDigits(DEMO_DIET.carbG), tone: "warn" },
                { label: "چربی (گرم)", value: faDigits(DEMO_DIET.fatG), tone: "ok" },
              ]}
            />

            <SectionHeading>وعده‌های امروز</SectionHeading>
            <ul className="fc-stagger grid list-none gap-2.5 p-0">
              {DEMO_DIET.meals.map((m) => (
                <li key={m.id} className="fc-card flex items-start gap-3.5 p-4">
                  <span className="fc-num w-12 shrink-0 pt-0.5 text-sm text-fc-cyan">
                    {m.time}
                  </span>
                  <div className="min-w-0 flex-1">
                    <b className="mb-1 block text-md">{m.name}</b>
                    <p className="text-sm leading-relaxed text-fc-muted">{m.items}</p>
                  </div>
                  <span className="shrink-0 text-end">
                    <b className="fc-num block text-md">{faDigits(m.kcal)}</b>
                    <small className="text-2xs text-fc-dim">کالری</small>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {tab === "progress" && (
          <>
            <header className="pt-6 pb-4">
              <h1 className="text-xl">پیشرفت</h1>
              <p className="text-xs text-fc-dim">از روی وزنه‌هایی که خودت ثبت کرده‌ای</p>
            </header>
            <ProgressView
              series={DEMO_SERIES}
              weeks={DEMO_WEEKS}
              totals={DEMO_TOTALS}
            />
          </>
        )}

        <div className="h-8" />
      </div>

      <nav aria-label="ناوبری نمایشی" className="fc-tabbar">
        <ul
          className="mx-auto grid max-w-[560px] list-none gap-1 px-2.5 pt-1.5"
          style={{ gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))` }}
        >
          {TABS.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => setTab(id)}
                aria-current={tab === id ? "page" : undefined}
                className="fc-tab w-full"
              >
                <Icon
                  className="size-[21px]"
                  strokeWidth={tab === id ? 2.4 : 1.9}
                  aria-hidden
                />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
