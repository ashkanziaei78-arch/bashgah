/** Today's energy, in and out, as one sum the member can follow.
 *
 *  Out = resting burn for the day plus ordinary non-gym movement
 *  (resting rate × 1.2, the standard "sedentary" factor) plus what the
 *  gym itself recorded today. Exercise outside the gym is deliberately
 *  absent, for the same reason as in gym-burn.ts: the coach cannot
 *  verify it.
 *
 *  The resting rate comes from the body analyser when there is a test
 *  on file, and from the Mifflin-St Jeor estimate otherwise; the source
 *  is carried through so the screen can say which.
 *
 *  Kept free of imports so `node --test` can load it. */

export type BmrSource = "analyzer" | "estimate";

export interface EnergyDay {
  /** What the plan or calculator says to eat today. */
  target: number;
  bmr: number;
  bmrSource: BmrSource;
  /** Resting rate plus ordinary daily movement. */
  baseline: number;
  gymBurn: number;
  totalOut: number;
  /** target − totalOut: positive is a surplus, negative a deficit. */
  balance: number;
}

const NON_EXERCISE_FACTOR = 1.2;

export function energyDay(input: {
  target: number;
  analyzerBmr: number | null;
  estimatedBmr: number | null;
  gymBurnToday: number;
}): EnergyDay | null {
  const fromAnalyzer = input.analyzerBmr !== null && input.analyzerBmr > 0;
  const bmr = fromAnalyzer ? input.analyzerBmr! : input.estimatedBmr;
  if (!bmr || bmr <= 0 || !(input.target > 0)) return null;
  const baseline = Math.round(bmr * NON_EXERCISE_FACTOR);
  const gymBurn = Math.max(0, Math.round(input.gymBurnToday));
  const totalOut = baseline + gymBurn;
  return {
    target: Math.round(input.target),
    bmr: Math.round(bmr),
    bmrSource: fromAnalyzer ? "analyzer" : "estimate",
    baseline,
    gymBurn,
    totalOut,
    balance: Math.round(input.target) - totalOut,
  };
}

/** Plain-language reading of the balance against the member's goal. */
export function balanceVerdict(
  balance: number,
  goal: "gain" | "lose" | "maintain"
): { tone: "ok" | "warn"; text: string } {
  const abs = Math.abs(balance);
  if (goal === "lose") {
    return balance < 0
      ? { tone: "ok", text: "کسری کالری دارید؛ مسیر کاهش وزن درست است." }
      : { tone: "warn", text: "امروز کسری ندارید؛ برای کاهش وزن کمی کمتر بخورید یا بیشتر تمرین کنید." };
  }
  if (goal === "gain") {
    return balance > 0
      ? { tone: "ok", text: "مازاد کالری دارید؛ برای عضله‌سازی همین مسیر درست است." }
      : { tone: "warn", text: "مازاد ندارید؛ برای افزایش وزن کمی بیشتر بخورید." };
  }
  return abs <= 250
    ? { tone: "ok", text: "دریافت و مصرفتان نزدیک به هم است." }
    : { tone: "warn", text: balance > 0 ? "امروز بیشتر از مصرف می‌خورید." : "امروز کمتر از مصرف می‌خورید." };
}
