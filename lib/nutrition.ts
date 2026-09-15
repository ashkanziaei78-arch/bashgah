/** Calorie and macro targets.
 *
 * Two layers by design: the numbers below are a deterministic formula
 * (Mifflin-St Jeor + activity factor), not a model call. A coach who
 * sees the target move by 80 kcal between two visits stops trusting the
 * app, so the arithmetic has to be reproducible. The language model's
 * job is the layer above this — turning these targets into actual meals.
 */

export type Sex = "male" | "female";
export type Goal = "gain" | "lose" | "maintain";

export interface BodyInput {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  /** 1 sedentary … 5 athlete */
  activityLevel: 1 | 2 | 3 | 4 | 5;
  goal: Goal;
}

export interface MacroTarget {
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  bmr: number;
  tdee: number;
}

const ACTIVITY_FACTOR: Record<number, number> = {
  1: 1.2, // desk job, no training
  2: 1.375, // 1–3 sessions a week
  3: 1.55, // 3–5 sessions a week
  4: 1.725, // 6–7 sessions a week
  5: 1.9, // twice a day / physical job
};

/** Mifflin-St Jeor resting metabolic rate. */
export function bmr({ sex, age, heightCm, weightKg }: BodyInput): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === "male" ? base + 5 : base - 161);
}

export function calcMacros(input: BodyInput): MacroTarget {
  const restingRate = bmr(input);
  const tdee = Math.round(restingRate * ACTIVITY_FACTOR[input.activityLevel]);

  // A 15% swing either way — aggressive enough to show on the scale in a
  // month, gentle enough that a lifter keeps their strength.
  const kcal =
    input.goal === "gain"
      ? Math.round(tdee * 1.15)
      : input.goal === "lose"
        ? Math.round(tdee * 0.85)
        : tdee;

  // Protein scales with bodyweight, fat takes a fixed share of energy,
  // carbohydrate absorbs the remainder.
  const proteinPerKg = input.goal === "lose" ? 2.4 : 2.0;
  const proteinG = Math.round(input.weightKg * proteinPerKg);
  const fatG = Math.round((kcal * 0.25) / 9);
  const carbG = Math.max(0, Math.round((kcal - proteinG * 4 - fatG * 9) / 4));

  return { kcal, proteinG, carbG, fatG, bmr: restingRate, tdee };
}

/** Whole years between a birth date and today. */
export function ageFrom(birthDate: string | Date): number {
  const b = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export const GOAL_LABEL: Record<Goal, string> = {
  gain: "افزایش حجم",
  lose: "کاهش وزن",
  maintain: "تثبیت وزن",
};

export const ACTIVITY_LABEL: Record<number, string> = {
  1: "کم‌تحرک",
  2: "هفته‌ای ۱ تا ۳ جلسه",
  3: "هفته‌ای ۳ تا ۵ جلسه",
  4: "هفته‌ای ۶ تا ۷ جلسه",
  5: "روزی دو جلسه",
};
