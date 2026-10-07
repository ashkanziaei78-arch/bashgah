/** A first draft of a programme from the gym's own exercise library.
 *
 *  Deterministic on purpose — no model, no network. The coach picks a
 *  goal, a split and a level; this fills the slots a sensible session
 *  of that kind has, from movements the gym actually has on file, and
 *  hands the coach an editable draft. The coach still decides; this
 *  just saves the twenty taps of building the obvious version. */

export type SuggestGoal = "gain" | "lose" | "strength" | "maintain";
export type SuggestSplit = "full" | "upper" | "lower" | "push" | "pull" | "legs";
export type SuggestLevel = "beginner" | "intermediate" | "advanced";
export type Region = "chest" | "back" | "shoulders" | "arms" | "legs" | "core" | "cardio";

export const GOAL_LABEL: Record<SuggestGoal, string> = {
  gain: "حجم و عضله",
  lose: "چربی‌سوزی",
  strength: "قدرت",
  maintain: "تناسب و نگهداری",
};
export const SPLIT_LABEL: Record<SuggestSplit, string> = {
  full: "تمام بدن",
  upper: "بالاتنه",
  lower: "پایین‌تنه",
  push: "پرسی (سینه، شانه، پشت‌بازو)",
  pull: "کششی (پشت، جلوبازو)",
  legs: "پا",
};
export const LEVEL_LABEL: Record<SuggestLevel, string> = {
  beginner: "مبتدی",
  intermediate: "متوسط",
  advanced: "پیشرفته",
};
export const REGION_LABEL: Record<Region, string> = {
  chest: "سینه", back: "پشت", shoulders: "شانه", arms: "بازو", legs: "پا", core: "شکم", cardio: "هوازی",
};

/** Muscle groups are free text typed by the admin, so a region is found
 *  by the words Iranian gyms actually use for it. Order matters:
 *  «پشت بازو» is an arm, not a back. */
const KEYWORDS: [Region, RegExp][] = [
  ["arms", /بازو|ساعد|دوسر|سه\s?سر/],
  ["shoulders", /شانه|دلتوئید|دلت/],
  ["chest", /سینه/],
  ["back", /پشت|زیربغل|زیر\s?بغل|لت|کول|ذوزنقه/],
  ["legs", /پا|ران|همستر|سرینی|باسن|ساق|چهارسر/],
  ["core", /شکم|میان\s?تنه|میان‌تنه|پهلو|کمر|core/i],
  ["cardio", /هوازی|کاردیو|cardio|دویدن|طناب/i],
];

export function regionOf(muscleGroup: string): Region | null {
  for (const [r, re] of KEYWORDS) if (re.test(muscleGroup)) return r;
  return null;
}

const SLOTS: Record<SuggestSplit, Region[]> = {
  full: ["legs", "chest", "back", "legs", "shoulders", "arms", "core"],
  upper: ["chest", "back", "chest", "back", "shoulders", "arms", "arms"],
  lower: ["legs", "legs", "legs", "legs", "core", "core"],
  push: ["chest", "chest", "shoulders", "chest", "shoulders", "arms"],
  pull: ["back", "back", "back", "arms", "arms", "core"],
  legs: ["legs", "legs", "legs", "legs", "legs", "core"],
};

interface Scheme { sets: number; reps: number; rest: number }

/** Sets × reps × rest for slot `i` of a session. The first two slots are
 *  the big compound lifts, which is where a strength goal earns its heavy,
 *  low-rep work. */
export function schemeFor(goal: SuggestGoal, i: number, region: Region): Scheme {
  if (region === "cardio") return { sets: 1, reps: 12, rest: 60 };
  if (region === "core") return { sets: 3, reps: 15, rest: 45 };
  switch (goal) {
    case "strength":
      return i < 2 ? { sets: 5, reps: 5, rest: 150 } : { sets: 3, reps: 8, rest: 90 };
    case "gain":
      return i < 2 ? { sets: 4, reps: 8, rest: 120 } : { sets: 3, reps: 12, rest: 75 };
    case "lose":
      return { sets: 3, reps: 15, rest: 45 };
    default:
      return { sets: 3, reps: 12, rest: 60 };
  }
}

const LEVEL_ORDER: Record<SuggestLevel, SuggestLevel[]> = {
  beginner: ["beginner", "intermediate"],
  intermediate: ["intermediate", "beginner", "advanced"],
  advanced: ["advanced", "intermediate", "beginner"],
};

export interface LibraryExercise { id: string; name: string; muscle_group: string; level: string }
export interface SuggestedItem { exerciseId: string; sets: number; reps: number; rest: number; region: Region }

/** Small stable hash so the same member gets the same draft each time,
 *  while two members on the same split do not get identical sheets. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function suggestProgram(
  library: LibraryExercise[],
  opts: { goal: SuggestGoal; split: SuggestSplit; level: SuggestLevel; seed?: string }
): { items: SuggestedItem[]; missing: Region[]; title: string } {
  const allowed = LEVEL_ORDER[opts.level];
  const pools = new Map<Region, LibraryExercise[]>();
  for (const e of library) {
    const r = regionOf(e.muscle_group);
    if (!r || !allowed.includes(e.level as SuggestLevel)) continue;
    const list = pools.get(r) ?? [];
    list.push(e);
    pools.set(r, list);
  }
  const seed = hash(`${opts.seed ?? ""}|${opts.split}|${opts.goal}`);
  for (const [r, list] of pools) {
    list.sort(
      (a, b) =>
        allowed.indexOf(a.level as SuggestLevel) - allowed.indexOf(b.level as SuggestLevel) ||
        a.name.localeCompare(b.name, "fa")
    );
    // Rotate within the preferred level only, so a beginner never gets
    // an advanced lift ahead of a beginner one just because of the seed.
    const top = list.filter((e) => e.level === list[0].level);
    const k = top.length ? seed % top.length : 0;
    pools.set(r, [...top.slice(k), ...top.slice(0, k), ...list.slice(top.length)]);
  }

  const used = new Set<string>();
  const items: SuggestedItem[] = [];
  const missing = new Set<Region>();
  const slots = [...SLOTS[opts.split]];
  if (opts.goal === "lose") slots.push("cardio");

  for (const region of slots) {
    const pick = (pools.get(region) ?? []).find((e) => !used.has(e.id));
    if (!pick) { missing.add(region); continue; }
    used.add(pick.id);
    items.push({ exerciseId: pick.id, region, ...schemeFor(opts.goal, items.length, region) });
  }

  return {
    items,
    missing: [...missing],
    title: `${SPLIT_LABEL[opts.split].split(" (")[0]} · ${GOAL_LABEL[opts.goal]}`,
  };
}
