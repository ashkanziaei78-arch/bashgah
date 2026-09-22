/** Fixtures for the public demo at /demo.
 *
 *  Invented, but plausible: a member four weeks into a push programme,
 *  mid-session, adding 2.5kg to the bench every fortnight. Round numbers
 *  and a perfect attendance record would make the screens look like a
 *  mock-up; a missed week and a stalled lift are what a real log holds.
 */
import type { ExerciseRow } from "@/components/exercise-list";
import type { ExerciseSeries } from "@/components/progress-view";

export const DEMO_NAME = "امیر تهرانی";

export const DEMO_MEMBERSHIP = {
  plan: "حرفه‌ای",
  sessionsTotal: 16,
  sessionsUsed: 9,
  daysLeft: 12,
};

export const DEMO_ROWS: ExerciseRow[] = [
  { itemId: "d1", name: "پرس سینه هالتر", sets: 4, reps: 10, rest: 90,
    instructions: "کتف‌ها را جمع نگه دار، میله را روی خط سینه پایین بیاور و آرنج را حدود ۴۵ درجه باز بگذار.",
    videoUrl: null, posterUrl: null, weight: 62.5, done: true, previous: 60 },
  { itemId: "d2", name: "قفسه سینه دمبل", sets: 3, reps: 12, rest: 60,
    instructions: "آرنج را کمی خم نگه دار و حرکت را از شانه اجرا کن، نه از آرنج.",
    videoUrl: null, posterUrl: null, weight: 18, done: true, previous: 18 },
  { itemId: "d3", name: "کراس اور سیم‌کش", sets: 3, reps: 15, rest: 60,
    instructions: "در انتهای حرکت یک مکث کوتاه بده تا سینه کاملاً منقبض شود.",
    videoUrl: null, posterUrl: null, weight: null, done: false, previous: 25 },
  { itemId: "d4", name: "جلوبازو هالتر", sets: 3, reps: 12, rest: 75,
    instructions: "آرنج را کنار بدن ثابت نگه دار؛ تاب‌دادن کمر یعنی وزنه سنگین است.",
    videoUrl: null, posterUrl: null, weight: null, done: false, previous: null },
  { itemId: "d5", name: "پشت بازو طناب", sets: 3, reps: 12, rest: 60,
    instructions: "در پایان حرکت طناب را کمی از هم باز کن.",
    videoUrl: null, posterUrl: null, weight: null, done: false, previous: 30 },
];

export const DEMO_SERIES: ExerciseSeries[] = [
  {
    name: "پرس سینه هالتر",
    points: [
      { label: "۲ مرداد", value: 55 },
      { label: "۹ مرداد", value: 57.5 },
      { label: "۱۶ مرداد", value: 57.5 },
      { label: "۲۳ مرداد", value: 60 },
      { label: "۳۰ مرداد", value: 60 },
      { label: "۶ شهریور", value: 62.5 },
    ],
  },
  {
    name: "اسکوات",
    points: [
      { label: "۴ مرداد", value: 80 },
      { label: "۱۱ مرداد", value: 85 },
      { label: "۱۸ مرداد", value: 85 },
      { label: "۲۵ مرداد", value: 90 },
      { label: "۸ شهریور", value: 95 },
    ],
  },
  {
    name: "ددلیفت",
    points: [
      { label: "۶ مرداد", value: 100 },
      { label: "۲۰ مرداد", value: 105 },
      { label: "۳ شهریور", value: 110 },
    ],
  },
  {
    name: "جلوبازو هالتر",
    points: [{ label: "۶ شهریور", value: 25 }],
  },
];

// A missed week in the middle: a flat four-every-week record reads as invented.
export const DEMO_WEEKS = [
  { label: "۷", value: 3 },
  { label: "۶", value: 4 },
  { label: "۵", value: 4 },
  { label: "۴", value: 0 },
  { label: "۳", value: 2 },
  { label: "۲", value: 4 },
  { label: "۱", value: 4 },
  { label: "این هفته", value: 3 },
];

export const DEMO_TOTALS = { sessions: 24, volumeKg: 18450, bestLift: 110 };

/** Saturday = 0. Wednesday is "today" in the demo. */
export const DEMO_ATTENDED = new Set([0, 1, 3]);
export const DEMO_TODAY_INDEX = 4;

export const DEMO_DIET = {
  kcal: 2650,
  proteinG: 165,
  carbG: 300,
  fatG: 75,
  meals: [
    { id: "m1", time: "۰۷:۳۰", name: "صبحانه", items: "۳ تخم‌مرغ، ۲ برش نان سنگک، پنیر کم‌چرب، گردو", kcal: 620 },
    { id: "m2", time: "۱۰:۳۰", name: "میان‌وعده", items: "ماست یونانی با عسل و موز", kcal: 310 },
    { id: "m3", time: "۱۳:۳۰", name: "ناهار", items: "۱۵۰ گرم سینه مرغ، برنج قهوه‌ای، سالاد فصل", kcal: 780 },
    { id: "m4", time: "۱۷:۰۰", name: "پیش از تمرین", items: "جو دوسر با شیر و کره بادام‌زمینی", kcal: 420 },
    { id: "m5", time: "۲۱:۰۰", name: "شام", items: "ماهی قزل‌آلا، سیب‌زمینی تنوری، سبزیجات بخارپز", kcal: 520 },
  ],
};
