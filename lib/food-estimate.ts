/** Reading a meal written in ordinary Persian and costing it in calories.
 *
 *  «دو تا تخم‌مرغ آب‌پز با یک کف دست نان سنگک و نصف لیوان شیر»
 *      → 2 × 55 g egg + 35 g sangak + 120 g milk  ≈ 320 kcal
 *
 *  Three passes: normalise the text so one word has one spelling, pull
 *  the amount and the household measure out of each phrase, then match
 *  what is left against the table in `food-table.ts`.
 *
 *  It runs entirely in the browser with no key, no request and no
 *  monthly bill, which is the only reason it can also work offline
 *  inside the installed app. The trade is that it knows exactly the
 *  foods in the table and nothing else — so it reports what it could not
 *  read instead of quietly guessing, and it answers with a band rather
 *  than a single number, because nobody's serving spoon is calibrated.
 */

import { FOODS, DEFAULT_UNIT_GRAMS, type Food, type UnitKey } from "./food-table";

// ---------------------------------------------------------------
// Normalising
// ---------------------------------------------------------------

/** Persian and Arabic-Indic digits share the Latin meaning. */
const DIGIT_MAP: Record<string, string> = {};
"۰۱۲۳۴۵۶۷۸۹".split("").forEach((d, i) => (DIGIT_MAP[d] = String(i)));
"٠١٢٣٤٥٦٧٨٩".split("").forEach((d, i) => (DIGIT_MAP[d] = String(i)));

/** One spelling per word.
 *
 *  A keyboard in Tehran produces Arabic ي and ك as readily as Persian ی
 *  and ک, and «تخم‌مرغ» is typed with a zero-width non-joiner, a space,
 *  or nothing at all. Matching without folding all of that together
 *  fails on text that looks identical on screen. */
export function normalise(input: string): string {
  return input
    .replace(/[ً-ْـ]/g, "") // harakat and tatweel
    .replace(/[​-‏⁠]/g, " ") // ZWNJ and friends
    .replace(/[يیۍ]/g, "ی")
    .replace(/[كک]/g, "ک")
    .replace(/[أإآا]/g, "ا")
    .replace(/[ۀة]/g, "ه")
    .replace(/[ؤئ]/g, "و")
    .replace(/[۰-۹٠-٩]/g, (d) => DIGIT_MAP[d] ?? d)
    .replace(/[^\p{L}\p{N}.\s]/gu, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------
// Amounts
// ---------------------------------------------------------------

const WORD_NUMBER: Record<string, number> = {
  نیم: 0.5,
  نصف: 0.5,
  ربع: 0.25,
  یک: 1,
  یه: 1,
  دو: 2,
  سه: 3,
  چهار: 4,
  پنج: 5,
  شش: 6,
  شیش: 6,
  هفت: 7,
  هشت: 8,
  نه: 9,
  ده: 10,
  یازده: 11,
  دوازده: 12,
  سیزده: 13,
  چهارده: 14,
  پانزده: 15,
  پونزده: 15,
  شانزده: 16,
  هفده: 17,
  هجده: 18,
  نوزده: 19,
  بیست: 20,
  سی: 30,
  چهل: 40,
  پنجاه: 50,
  شصت: 60,
  هفتاد: 70,
  هشتاد: 80,
  نود: 90,
  صد: 100,
  صدو: 100,
  دویست: 200,
  سیصد: 300,
  چهارصد: 400,
  پانصد: 500,
};

/** Household measures, after the multi-word ones are glued together. */
const UNIT_WORD: Record<string, UnitKey | "gram" | "kilo"> = {
  گرم: "gram",
  گرمی: "gram",
  g: "gram",
  gr: "gram",
  کیلو: "kilo",
  کیلوگرم: "kilo",
  kg: "kilo",
  عدد: "piece",
  تا: "piece",
  دانه: "piece",
  حبه: "piece",
  قوطی: "piece",
  بسته: "piece",
  لیوان: "cup",
  فنجان: "cup",
  پیمانه: "cup",
  قاشق: "tbsp",
  قاشقچایخوری: "tsp",
  کفدست: "palm",
  برش: "slice",
  تکه: "slice",
  اسلایس: "slice",
  سیخ: "skewer",
  بشقاب: "plate",
  پرس: "plate",
  ملاقه: "ladle",
  اسکوپ: "scoop",
};

/** Multi-word measures collapse to one token so the walker below can
 *  treat every measure the same way. Order matters: the longer phrase
 *  has to be replaced before the shorter one inside it. */
const UNIT_PHRASES: [RegExp, string][] = [
  // «دوتا» is written as one word at least as often as two. Split it
  // back apart before anything else, or the amount is never seen and
  // the phrase silently falls back to a default serving.
  [
    /(\d+|یک|یه|دو|سه|چهار|پنج|شش|شیش|هفت|هشت|نه|ده)\s*تا(?=\s|$)/g,
    "$1 تا",
  ],
  [/قاشق\s+چای\s*خوری/g, "قاشقچایخوری"],
  [/قاشق\s+مربا\s*خوری/g, "قاشقچایخوری"],
  [/قاشق\s+غذا\s*خوری/g, "قاشق"],
  [/قاشق\s+سوپ\s*خوری/g, "قاشق"],
  [/کف\s+دست/g, "کفدست"],
];

interface Amount {
  grams: number;
  /** explicit — a weight was given; unit — a household measure was
   *  given; assumed — nobody said, so the table's serving was used. */
  basis: "explicit" | "unit" | "assumed";
  /** What is left of the phrase once the amount is taken out. */
  rest: string;
}

/** Pulls the amount out of one phrase and hands back the food words. */
function readAmount(phrase: string, food: Food | null): Amount {
  let text = phrase;
  for (const [pattern, glued] of UNIT_PHRASES) text = text.replace(pattern, glued);

  const tokens = text.split(" ").filter(Boolean);
  const rest: string[] = [];

  let count: number | null = null;
  let unit: UnitKey | "gram" | "kilo" | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // «یک و نیم» is one amount, not one plus a half of something else.
    const asWord = WORD_NUMBER[token];
    if (asWord !== undefined) {
      let value = asWord;
      if (tokens[i + 1] === "و" && WORD_NUMBER[tokens[i + 2]] !== undefined) {
        value += WORD_NUMBER[tokens[i + 2]];
        i += 2;
      }
      count = (count ?? 0) + value;
      continue;
    }

    if (/^\d+(\.\d+)?$/.test(token)) {
      count = (count ?? 0) + Number(token);
      continue;
    }

    const asUnit = UNIT_WORD[token];
    if (asUnit !== undefined) {
      unit = asUnit;
      continue;
    }

    rest.push(token);
  }

  const restText = rest.join(" ");

  if (unit === "gram") {
    // "گرم" with no number in front of it measures nothing. Fall back to
    // the serving, but call it a guess so the confidence reflects that.
    if (count === null) {
      return { grams: food?.serving ?? 100, basis: "assumed", rest: restText };
    }
    return { grams: count, basis: "explicit", rest: restText };
  }
  if (unit === "kilo") {
    return { grams: (count ?? 1) * 1000, basis: "explicit", rest: restText };
  }
  if (unit) {
    const per = food?.portions[unit] ?? DEFAULT_UNIT_GRAMS[unit];
    return { grams: (count ?? 1) * per, basis: "unit", rest: restText };
  }
  if (count !== null) {
    // A bare number. Small ones count pieces — "۳ تخم مرغ"; large ones
    // are a weight somebody did not bother to label — "۲۰۰ برنج".
    if (count >= 20) {
      return { grams: count, basis: "explicit", rest: restText };
    }
    const per = food?.portions.piece ?? food?.serving ?? DEFAULT_UNIT_GRAMS.piece;
    return { grams: count * per, basis: "unit", rest: restText };
  }

  return { grams: food?.serving ?? 100, basis: "assumed", rest: restText };
}

// ---------------------------------------------------------------
// Matching
// ---------------------------------------------------------------

interface Indexed {
  food: Food;
  /** normalised name and aliases, longest first */
  keys: string[];
}

const INDEX: Indexed[] = FOODS.map((food) => ({
  food,
  keys: [food.name, ...food.aliases]
    .map(normalise)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length),
}));

export type MatchKind = "exact" | "partial" | "fuzzy";

function jaccard(a: Set<string>, b: Set<string>): number {
  let shared = 0;
  for (const token of a) if (b.has(token)) shared++;
  return shared / (a.size + b.size - shared);
}

/** Finds the food a phrase is talking about.
 *
 *  Containment is checked one way only — the phrase may contain the
 *  food's name, never the reverse. The reverse would read «سیب» as
 *  «سیب زمینی سرخ کرده», a fivefold error on the calories. Among the
 *  names a phrase does contain the longest wins, so «کره بادام زمینی»
 *  beats both «کره» and «بادام». */
export function matchFood(
  phrase: string
): { food: Food; kind: MatchKind } | null {
  const query = normalise(phrase);
  if (query.length < 2) return null;

  let partial: { food: Food; length: number } | null = null;

  for (const entry of INDEX) {
    for (const key of entry.keys) {
      if (key === query) return { food: entry.food, kind: "exact" };
      if (key.length >= 3 && query.includes(key)) {
        if (!partial || key.length > partial.length) {
          partial = { food: entry.food, length: key.length };
        }
        break;
      }
    }
  }

  if (partial) return { food: partial.food, kind: "partial" };

  // Nothing contained the name outright — a typo, or a word order the
  // table does not carry. Fall back to word overlap, and say so.
  const queryTokens = new Set(query.split(" ").filter((t) => t.length > 1));
  if (queryTokens.size === 0) return null;

  let best: { food: Food; score: number } | null = null;
  for (const entry of INDEX) {
    for (const key of entry.keys) {
      const score = jaccard(queryTokens, new Set(key.split(" ")));
      if (score > (best?.score ?? 0)) best = { food: entry.food, score };
    }
  }

  return best && best.score >= 0.5 ? { food: best.food, kind: "fuzzy" } : null;
}

// ---------------------------------------------------------------
// Estimating
// ---------------------------------------------------------------

export interface EstimatedItem {
  /** The phrase as the person wrote it, for the breakdown. */
  input: string;
  food: Food;
  grams: number;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  basis: Amount["basis"];
  match: MatchKind;
}

export interface Estimate {
  items: EstimatedItem[];
  /** Phrases the table has no entry for — shown, never silently dropped. */
  unknown: string[];
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  /** Half-width of the honest range, as a fraction of kcal. */
  spread: number;
  confidence: "high" | "medium" | "low";
}

/** Splits a written meal into the separate things that were eaten.
 *
 *  Only « و » with spaces around it, so «بادام زمینی» survives intact. */
function phrases(text: string): string[] {
  const split = text
    .split(/[،,؛;\n\r+]|\sو\s|\sبا\s|\sهمراه\s/u)
    .map((p) => p.trim())
    .filter(Boolean);

  // Splitting on « و » also cuts compound numerals in half: «صد و
  // پنجاه گرم مرغ» arrives as «صد» and «پنجاه گرم مرغ», and the first
  // half is a number with nothing to count. Any fragment that is only
  // numbers belongs to the fragment after it — and because the reader
  // adds every number it meets, «صد پنجاه» comes back out as 150.
  const merged: string[] = [];
  let carry = "";

  for (const phrase of split) {
    const tokens = normalise(phrase).split(" ").filter(Boolean);
    if (tokens.length === 0) continue;

    const onlyNumbers = tokens.every(
      (t) => WORD_NUMBER[t] !== undefined || /^\d+(\.\d+)?$/.test(t)
    );

    if (onlyNumbers) {
      carry = carry ? `${carry} ${phrase}` : phrase;
      continue;
    }

    merged.push(carry ? `${carry} ${phrase}` : phrase);
    carry = "";
  }

  // A number with nothing after it names no food; it is reported
  // unrecognised rather than attached to whatever came before.
  if (carry) merged.push(carry);

  return merged;
}

const EMPTY: Estimate = {
  items: [],
  unknown: [],
  kcal: 0,
  protein: 0,
  carb: 0,
  fat: 0,
  spread: 0,
  confidence: "low",
};

export function estimateMeal(text: string): Estimate {
  if (!text.trim()) return EMPTY;

  const items: EstimatedItem[] = [];
  const unknown: string[] = [];

  for (const phrase of phrases(text)) {
    const normalised = normalise(phrase);

    // The amount is read twice: once to find the food with the measure
    // words out of the way, then again now that the food is known, so
    // its own portion weights apply — a tablespoon of oil is 14 g, not
    // the generic 15, and one date is 8 g, not 100.
    const probe = readAmount(normalised, null);
    const hit = matchFood(probe.rest) ?? matchFood(normalised);

    if (!hit) {
      unknown.push(phrase.trim());
      continue;
    }

    const amount = readAmount(normalised, hit.food);
    const grams = Math.max(1, Math.round(amount.grams));
    const scale = grams / 100;

    items.push({
      input: phrase.trim(),
      food: hit.food,
      grams,
      kcal: Math.round(hit.food.kcal * scale),
      protein: Math.round(hit.food.protein * scale * 10) / 10,
      carb: Math.round(hit.food.carb * scale * 10) / 10,
      fat: Math.round(hit.food.fat * scale * 10) / 10,
      basis: amount.basis,
      match: hit.kind,
    });
  }

  if (items.length === 0) return { ...EMPTY, unknown };

  const sum = (pick: (i: EstimatedItem) => number) =>
    items.reduce((total, item) => total + pick(item), 0);

  const assumed = items.filter((i) => i.basis === "assumed").length / items.length;
  const fuzzy = items.filter((i) => i.match === "fuzzy").length / items.length;

  // A reference table against a real plate is worth about ±12% on its
  // own. Guessing the portion costs more than guessing which food.
  const spread = Math.min(0.3, 0.12 + 0.13 * assumed + 0.08 * fuzzy);

  const confidence: Estimate["confidence"] =
    unknown.length > 0 || spread > 0.22
      ? "low"
      : assumed > 0 || fuzzy > 0
        ? "medium"
        : "high";

  return {
    items,
    unknown,
    kcal: Math.round(sum((i) => i.kcal)),
    protein: Math.round(sum((i) => i.protein)),
    carb: Math.round(sum((i) => i.carb)),
    fat: Math.round(sum((i) => i.fat)),
    spread,
    confidence,
  };
}

export const CONFIDENCE_LABEL: Record<Estimate["confidence"], string> = {
  high: "برآورد مطمئن",
  medium: "برآورد تقریبی",
  low: "برآورد خام",
};
