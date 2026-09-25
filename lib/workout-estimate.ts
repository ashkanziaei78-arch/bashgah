/** What a programme costs the member: time on the floor, and energy.
 *
 * Both numbers are derived from the programme the coach actually wrote —
 * sets, reps, rest, and the member's own bodyweight — not typed in and
 * not decorative. Same rule as the calorie targets in `nutrition.ts`: a
 * figure the member sees has to be reproducible, or the first time it
 * disagrees with their watch they stop believing any of it.
 */

export type Level = "beginner" | "intermediate" | "advanced";

export interface EstimateItem {
  sets: number;
  restSeconds: number;
  /** From the exercise library; falls back to a working average. */
  durationSeconds: number | null;
  level: Level | null;
}

export interface WorkoutEstimate {
  minutes: number;
  kcal: number | null;
  level: Level;
}

/** A set nobody timed. Most compound lifts at 8–15 reps land near here. */
const ASSUMED_SET_SECONDS = 45;

/** Getting changed, warming up, and walking between racks. */
const OVERHEAD_MINUTES = 6;

/* Compendium of Physical Activities, resistance training:
 *   light/moderate effort .......... 3.5
 *   vigorous, 8–15 reps ............ 6.0
 * Graded by the hardest movement in the programme, since that is what
 * sets the pace of the whole session. */
const MET: Record<Level, number> = {
  beginner: 3.5,
  intermediate: 5.0,
  advanced: 6.0,
};

const RANK: Record<Level, number> = { beginner: 0, intermediate: 1, advanced: 2 };

export function estimateWorkout(
  items: EstimateItem[],
  bodyweightKg: number | null
): WorkoutEstimate {
  let seconds = 0;
  let level: Level = "beginner";

  for (const item of items) {
    const work = item.durationSeconds ?? ASSUMED_SET_SECONDS;
    // The last rest of the last exercise is never actually taken, but one
    // rest period inside a half-hour session is noise — not worth the
    // special case.
    seconds += item.sets * (work + item.restSeconds);
    if (item.level && RANK[item.level] > RANK[level]) level = item.level;
  }

  const minutes = items.length === 0 ? 0 : Math.round(seconds / 60) + OVERHEAD_MINUTES;

  // kcal/min = MET × 3.5 × kg / 200 — the standard conversion. Without a
  // weight on file there is no honest number, so it returns null and the
  // card drops the tile rather than inventing one.
  const kcal =
    bodyweightKg && minutes > 0
      ? Math.round((MET[level] * 3.5 * bodyweightKg * minutes) / 200)
      : null;

  return { minutes, kcal, level };
}

export const LEVEL_LABEL: Record<Level, string> = {
  beginner: "مبتدی",
  intermediate: "متوسط",
  advanced: "پیشرفته",
};
