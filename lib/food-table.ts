/** A calorie table for the food people in Tehran actually eat.
 *
 *  Everything here is per 100 grams, because that is the only way to
 *  compare a skewer of kebab with a spoon of olive oil. The portion
 *  weights turn what somebody types — "two eggs", "half a glass of
 *  rice", "a palm of sangak" — back into grams.
 *
 *  The numbers are reference values for a typical preparation, not a
 *  laboratory assay of one gym member's dinner. A home cook's ghormeh
 *  sabzi swings by a third depending on the oil, so the estimator built
 *  on this table reports a band rather than a single figure. Chasing
 *  more decimal places here would be false precision.
 */

export type FoodGroup =
  | "grain"
  | "protein"
  | "dairy"
  | "legume"
  | "nut"
  | "fruit"
  | "veg"
  | "fat"
  | "dish"
  | "sweet"
  | "drink"
  | "supplement";

/** The household measures an Iranian kitchen is described in. */
export type UnitKey =
  | "piece"
  | "cup"
  | "tbsp"
  | "tsp"
  | "palm"
  | "slice"
  | "skewer"
  | "plate"
  | "ladle"
  | "scoop";

export interface Food {
  id: string;
  name: string;
  /** Other spellings and the short form people actually say. */
  aliases: string[];
  group: FoodGroup;
  /** per 100 g */
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  /** Grams in one serving, used when nobody says how much. */
  serving: number;
  /** Grams per unit where the household default below is wrong. */
  portions: Partial<Record<UnitKey, number>>;
}

/** What one of each measure weighs when the food does not say otherwise.
 *  A tablespoon of oil and a tablespoon of rice are not the same weight,
 *  which is why a food may override any of these. */
export const DEFAULT_UNIT_GRAMS: Record<UnitKey, number> = {
  piece: 100,
  cup: 200,
  tbsp: 15,
  tsp: 5,
  palm: 30,
  slice: 30,
  skewer: 100,
  plate: 300,
  ladle: 150,
  scoop: 30,
};

function f(
  id: string,
  name: string,
  group: FoodGroup,
  kcal: number,
  protein: number,
  carb: number,
  fat: number,
  serving: number,
  aliases: string[] = [],
  portions: Partial<Record<UnitKey, number>> = {}
): Food {
  return { id, name, group, kcal, protein, carb, fat, serving, aliases, portions };
}

export const FOODS: Food[] = [
  // ---------------- نان و غلات ----------------
  f("barbari", "نان بربری", "grain", 280, 9, 55, 2, 60, ["نان"], { palm: 35, piece: 240, slice: 35 }),
  f("sangak", "نان سنگک", "grain", 250, 8.5, 51, 1.5, 60, [], { palm: 35, piece: 220, slice: 35 }),
  f("lavash", "نان لواش", "grain", 290, 9, 58, 2, 40, [], { palm: 25, piece: 40, slice: 25 }),
  f("taftoon", "نان تافتون", "grain", 270, 8.5, 54, 1.8, 55, [], { palm: 30, piece: 90, slice: 30 }),
  f("baguette", "نان باگت", "grain", 274, 9, 52, 3, 80, ["نان فرانسوی", "باگت"], { piece: 150, slice: 30 }),
  f("toast-bread", "نان تست", "grain", 265, 9, 49, 3.5, 50, ["تست"], { piece: 25, slice: 25 }),
  f("rice-cooked", "برنج پخته", "grain", 130, 2.7, 28, 0.3, 180, ["برنج", "پلو", "چلو"], { cup: 180, plate: 300, ladle: 160 }),
  f("kateh", "کته", "grain", 140, 2.8, 30, 0.8, 180, [], { cup: 180, plate: 300 }),
  f("pasta-cooked", "ماکارونی پخته", "grain", 158, 5.8, 31, 0.9, 200, ["ماکارونی", "اسپاگتی", "پاستا"], { cup: 180, plate: 300 }),
  f("oats", "جو دوسر", "grain", 389, 16.9, 66, 6.9, 45, ["اوتمیل", "جو پرک", "بلغور جو"], { cup: 90, tbsp: 10 }),
  f("potato-boiled", "سیب زمینی آب پز", "grain", 87, 1.9, 20, 0.1, 150, ["سیب زمینی"], { piece: 150 }),
  f("potato-fried", "سیب زمینی سرخ کرده", "grain", 312, 3.4, 41, 15, 130, ["سیب زمینی سرخ شده", "چیپس فرنچ", "فرنچ فرایز"], {}),
  f("corn-flakes", "کورن فلکس", "grain", 357, 7, 84, 0.9, 40, ["کرن فلکس", "سریال"], { cup: 40 }),

  // ---------------- پروتئین ----------------
  f("chicken-breast", "سینه مرغ", "protein", 165, 31, 0, 3.6, 150, ["مرغ", "فیله مرغ"], { piece: 170, palm: 100 }),
  f("chicken-thigh", "ران مرغ", "protein", 209, 26, 0, 11, 150, [], { piece: 160 }),
  f("beef", "گوشت گوساله", "protein", 250, 26, 0, 15, 130, ["گوشت قرمز", "گوشت", "استیک"], { palm: 100 }),
  f("minced-meat", "گوشت چرخ کرده", "protein", 254, 26, 0, 17, 120, ["قیمه ریز"], {}),
  f("lamb", "گوشت گوسفند", "protein", 294, 25, 0, 21, 120, ["گوشت بره"], {}),
  f("trout", "ماهی قزل آلا", "protein", 190, 20, 0, 12, 150, ["ماهی", "قزل آلا", "سالمون"], { piece: 180, palm: 100 }),
  f("tuna", "تن ماهی", "protein", 116, 26, 0, 1, 90, ["ماهی تن", "کنسرو تن"], { piece: 90 }),
  f("egg", "تخم مرغ", "protein", 155, 13, 1.1, 11, 55, ["تخم‌مرغ", "تخم مرغ آب پز"], { piece: 55 }),
  f("egg-white", "سفیده تخم مرغ", "protein", 52, 11, 0.7, 0.2, 33, ["سفیده"], { piece: 33 }),
  f("shrimp", "میگو", "protein", 99, 24, 0.2, 0.3, 120, [], {}),
  f("turkey", "بوقلمون", "protein", 189, 29, 0, 7, 140, [], {}),
  f("koobideh", "کباب کوبیده", "protein", 265, 18, 3, 20, 100, ["کوبیده"], { skewer: 100, piece: 100 }),
  f("joojeh", "جوجه کباب", "protein", 190, 27, 2, 8, 120, ["جوجه"], { skewer: 120, piece: 120 }),
  f("barg", "کباب برگ", "protein", 215, 27, 1, 11, 130, ["برگ"], { skewer: 130, piece: 130 }),
  f("sausage", "سوسیس", "protein", 300, 12, 3, 27, 80, ["هات داگ"], { piece: 60 }),
  f("bologna", "کالباس", "protein", 270, 13, 4, 22, 60, [], { slice: 20 }),
  f("burger-patty", "همبرگر", "protein", 295, 17, 8, 22, 90, ["برگر"], { piece: 90 }),

  // ---------------- لبنیات ----------------
  f("milk-low", "شیر کم چرب", "dairy", 42, 3.4, 5, 1, 240, ["شیر"], { cup: 240 }),
  f("milk-full", "شیر پرچرب", "dairy", 61, 3.2, 4.8, 3.3, 240, [], { cup: 240 }),
  f("yogurt-low", "ماست کم چرب", "dairy", 63, 5.3, 7, 1.6, 150, ["ماست"], { cup: 220, tbsp: 20, ladle: 120 }),
  f("yogurt-full", "ماست پرچرب", "dairy", 61, 3.5, 4.7, 3.3, 150, [], { cup: 220, tbsp: 20 }),
  f("greek-yogurt", "ماست یونانی", "dairy", 59, 10, 3.6, 0.4, 170, ["ماست چکیده"], { cup: 220, tbsp: 20 }),
  f("feta", "پنیر", "dairy", 264, 14, 2, 21, 30, ["پنیر سفید", "پنیر لیقوان", "پنیر فتا"], { piece: 30, slice: 25 }),
  f("mozzarella", "پنیر پیتزا", "dairy", 300, 22, 3, 22, 40, ["موزارلا"], {}),
  f("doogh", "دوغ", "dairy", 25, 1.3, 2, 1, 250, [], { cup: 250, piece: 280 }),
  f("kashk", "کشک", "dairy", 90, 10, 6, 2.5, 30, [], { tbsp: 18 }),
  f("cream", "خامه", "dairy", 340, 2.1, 2.8, 36, 30, [], { tbsp: 15 }),
  f("butter", "کره", "fat", 717, 0.9, 0.1, 81, 15, [], { tbsp: 14, tsp: 5 }),

  // ---------------- حبوبات و مغزها ----------------
  f("lentil", "عدس پخته", "legume", 116, 9, 20, 0.4, 150, ["عدس"], { cup: 200, ladle: 140 }),
  f("pinto", "لوبیا چیتی", "legume", 127, 9, 23, 0.5, 150, ["لوبیا"], { cup: 200 }),
  f("chickpea", "نخود پخته", "legume", 164, 8.9, 27, 2.6, 130, ["نخود"], { cup: 180 }),
  f("split-pea", "لپه", "legume", 116, 8, 21, 0.4, 130, [], { cup: 180 }),
  f("almond", "بادام", "nut", 579, 21, 22, 50, 25, [], { piece: 1.2, tbsp: 12 }),
  f("walnut", "گردو", "nut", 654, 15, 14, 65, 25, [], { piece: 5, tbsp: 12 }),
  f("pistachio", "پسته", "nut", 560, 20, 28, 45, 25, [], { piece: 0.8, tbsp: 12 }),
  f("peanut", "بادام زمینی", "nut", 567, 26, 16, 49, 25, [], { tbsp: 12 }),
  f("peanut-butter", "کره بادام زمینی", "nut", 588, 25, 20, 50, 20, [], { tbsp: 16, tsp: 6 }),
  f("hazelnut", "فندق", "nut", 628, 15, 17, 61, 25, [], { piece: 1.2 }),
  f("sunflower-seed", "تخمه آفتابگردان", "nut", 584, 21, 20, 51, 30, ["تخمه"], { tbsp: 10 }),

  // ---------------- میوه ----------------
  f("apple", "سیب", "fruit", 52, 0.3, 14, 0.2, 180, [], { piece: 180 }),
  f("banana", "موز", "fruit", 89, 1.1, 23, 0.3, 120, [], { piece: 120 }),
  f("orange", "پرتقال", "fruit", 47, 0.9, 12, 0.1, 150, [], { piece: 150 }),
  f("grape", "انگور", "fruit", 69, 0.7, 18, 0.2, 150, [], { cup: 150 }),
  f("watermelon", "هندوانه", "fruit", 30, 0.6, 8, 0.2, 300, [], { slice: 280 }),
  f("date", "خرما", "fruit", 282, 2.5, 75, 0.4, 24, [], { piece: 8 }),
  f("dried-fig", "انجیر خشک", "fruit", 249, 3.3, 64, 0.9, 40, ["انجیر"], { piece: 9 }),
  f("raisin", "کشمش", "fruit", 299, 3.1, 79, 0.5, 30, [], { tbsp: 12 }),
  f("strawberry", "توت فرنگی", "fruit", 32, 0.7, 8, 0.3, 150, [], { cup: 150 }),
  f("kiwi", "کیوی", "fruit", 61, 1.1, 15, 0.5, 75, [], { piece: 75 }),
  f("pomegranate", "انار", "fruit", 83, 1.7, 19, 1.2, 150, [], { piece: 250, cup: 170 }),
  f("peach", "هلو", "fruit", 39, 0.9, 10, 0.3, 150, [], { piece: 150 }),
  f("pear", "گلابی", "fruit", 57, 0.4, 15, 0.1, 175, [], { piece: 175 }),
  f("pineapple", "آناناس", "fruit", 50, 0.5, 13, 0.1, 150, [], { slice: 85 }),
  f("avocado", "آووکادو", "fruit", 160, 2, 9, 15, 100, ["آوکادو"], { piece: 150 }),
  f("melon", "طالبی", "fruit", 34, 0.8, 8, 0.2, 250, [], { slice: 200 }),

  // ---------------- سبزیجات ----------------
  f("cucumber", "خیار", "veg", 15, 0.7, 3.6, 0.1, 120, [], { piece: 120 }),
  f("tomato", "گوجه فرنگی", "veg", 18, 0.9, 3.9, 0.2, 120, ["گوجه"], { piece: 120 }),
  f("lettuce", "کاهو", "veg", 15, 1.4, 2.9, 0.2, 100, [], { cup: 60 }),
  f("carrot", "هویج", "veg", 41, 0.9, 10, 0.2, 80, [], { piece: 70 }),
  f("onion", "پیاز", "veg", 40, 1.1, 9, 0.1, 100, [], { piece: 110 }),
  f("eggplant", "بادمجان", "veg", 25, 1, 6, 0.2, 200, [], { piece: 250 }),
  f("zucchini", "کدو", "veg", 17, 1.2, 3.1, 0.3, 150, [], { piece: 180 }),
  f("bell-pepper", "فلفل دلمه", "veg", 31, 1, 6, 0.3, 120, [], { piece: 120 }),
  f("broccoli", "کلم بروکلی", "veg", 34, 2.8, 7, 0.4, 120, ["بروکلی"], { cup: 90 }),
  f("spinach", "اسفناج", "veg", 23, 2.9, 3.6, 0.4, 120, [], { cup: 40 }),
  f("mushroom", "قارچ", "veg", 22, 3.1, 3.3, 0.3, 120, [], { cup: 80 }),
  f("corn", "ذرت", "veg", 96, 3.4, 21, 1.5, 120, [], { cup: 160 }),
  f("sabzi-khordan", "سبزی خوردن", "veg", 30, 2.5, 4, 0.5, 40, ["سبزیجات"], {}),

  // ---------------- چربی و چاشنی ----------------
  f("olive-oil", "روغن زیتون", "fat", 884, 0, 0, 100, 14, [], { tbsp: 14, tsp: 4.5 }),
  f("oil", "روغن", "fat", 884, 0, 0, 100, 14, ["روغن مایع", "روغن آفتابگردان"], { tbsp: 14, tsp: 4.5 }),
  f("mayonnaise", "مایونز", "fat", 680, 1, 2, 75, 15, ["سس مایونز"], { tbsp: 15 }),
  f("tahini", "ارده", "fat", 595, 17, 21, 53, 20, [], { tbsp: 15 }),
  f("olive", "زیتون", "fat", 145, 1, 4, 15, 30, [], { piece: 4 }),

  // ---------------- غذاهای ایرانی ----------------
  f("ghormeh", "قورمه سبزی", "dish", 155, 9, 6, 10, 250, [], { plate: 280, ladle: 150 }),
  f("gheymeh", "قیمه", "dish", 145, 8, 9, 8, 250, ["خورش قیمه"], { plate: 280, ladle: 150 }),
  f("zereshk-polo", "زرشک پلو با مرغ", "dish", 180, 9, 24, 5.5, 350, ["زرشک پلو"], { plate: 380 }),
  f("chelo-kabab", "چلو کباب", "dish", 205, 10, 20, 9, 350, [], { plate: 400 }),
  f("abgoosht", "آبگوشت", "dish", 120, 7, 9, 6, 350, ["دیزی"], { plate: 400, ladle: 180 }),
  f("kuku", "کوکو سبزی", "dish", 210, 8, 9, 16, 120, ["کوکو"], { piece: 70, slice: 70 }),
  f("mirza", "میرزا قاسمی", "dish", 130, 4, 7, 9, 200, [], { plate: 220 }),
  f("adasi", "عدسی", "dish", 110, 7, 17, 1.5, 250, [], { plate: 280, ladle: 150 }),
  f("halim", "حلیم", "dish", 130, 6, 19, 3.5, 250, [], { plate: 280 }),
  f("kashk-bademjan", "کشک بادمجان", "dish", 165, 5, 9, 12, 180, [], { plate: 200 }),
  f("tahchin", "ته چین", "dish", 220, 9, 27, 8.5, 250, [], { piece: 200, plate: 280 }),
  f("baghali-polo", "باقالی پلو", "dish", 185, 6, 28, 5.5, 300, [], { plate: 330 }),
  f("omelet", "املت", "dish", 165, 8, 5, 12, 180, [], { plate: 200 }),
  f("nimroo", "نیمرو", "dish", 190, 10, 1, 16, 120, ["تخم مرغ نیمرو"], { piece: 60 }),
  f("pasta-meat", "ماکارونی با گوشت", "dish", 180, 8, 22, 6.5, 300, [], { plate: 330 }),
  f("shirazi", "سالاد شیرازی", "dish", 30, 0.8, 5, 0.8, 150, [], { plate: 170 }),
  f("olivieh", "سالاد الویه", "dish", 240, 7, 13, 18, 150, ["الویه"], { plate: 180 }),
  f("pizza", "پیتزا", "dish", 266, 11, 33, 10, 200, [], { slice: 110, piece: 400 }),
  f("falafel", "فلافل", "dish", 240, 7, 30, 10, 200, ["ساندویچ فلافل"], { piece: 25 }),
  f("kotlet", "کتلت", "dish", 260, 11, 18, 16, 120, [], { piece: 80 }),
  f("shami", "شامی", "dish", 250, 12, 16, 15, 120, [], { piece: 75 }),
  f("dolmeh", "دلمه", "dish", 140, 5, 15, 6.5, 200, [], { piece: 45 }),
  f("ash-reshteh", "آش رشته", "dish", 105, 4.5, 16, 2.5, 300, ["آش"], { plate: 330, ladle: 170 }),
  f("barley-soup", "سوپ جو", "dish", 70, 2.5, 11, 1.5, 300, ["سوپ"], { plate: 300, ladle: 170 }),
  f("khoresht-bademjan", "خورش بادمجان", "dish", 150, 7, 8, 10, 250, [], { plate: 280, ladle: 150 }),
  f("salad", "سالاد", "dish", 25, 1.2, 4.5, 0.4, 150, ["سالاد فصل"], { plate: 170 }),

  // ---------------- شیرینی و تنقلات ----------------
  f("sugar", "شکر", "sweet", 387, 0, 100, 0, 10, ["قند"], { tsp: 5, tbsp: 12, piece: 4 }),
  f("honey", "عسل", "sweet", 304, 0.3, 82, 0, 20, [], { tbsp: 21, tsp: 7 }),
  f("nabat", "نبات", "sweet", 390, 0, 100, 0, 10, [], { piece: 10 }),
  f("halva", "حلوا شکری", "sweet", 516, 12, 51, 31, 40, ["حلوا ارده"], {}),
  f("chocolate", "شکلات", "sweet", 535, 7.6, 59, 30, 30, [], { piece: 10 }),
  f("biscuit", "بیسکویت", "sweet", 460, 6, 70, 17, 30, ["بیسکوییت"], { piece: 10 }),
  f("chips", "چیپس", "sweet", 536, 7, 53, 34, 40, [], {}),
  f("puffak", "پفک", "sweet", 520, 6, 57, 30, 40, [], {}),
  f("cake", "کیک", "sweet", 400, 6, 50, 19, 70, ["کیک یزدی"], { piece: 60, slice: 80 }),
  f("ice-cream", "بستنی", "sweet", 207, 3.5, 24, 11, 100, [], { piece: 90, cup: 130 }),
  f("shirini", "شیرینی", "sweet", 430, 5.5, 52, 22, 40, ["شیرینی تر"], { piece: 35 }),

  // ---------------- نوشیدنی ----------------
  f("tea", "چای", "drink", 1, 0, 0.2, 0, 200, [], { cup: 200 }),
  f("coffee", "قهوه", "drink", 2, 0.1, 0, 0, 200, ["نسکافه", "اسپرسو"], { cup: 200 }),
  f("soda", "نوشابه", "drink", 42, 0, 10.6, 0, 300, ["نوشابه گازدار"], { cup: 250, piece: 330 }),
  f("juice", "آبمیوه", "drink", 46, 0.5, 11, 0.1, 250, ["آب پرتقال", "آب میوه"], { cup: 250, piece: 240 }),
  f("water", "آب", "drink", 0, 0, 0, 0, 250, [], { cup: 250 }),

  // ---------------- مکمل ----------------
  f("whey", "پودر پروتئین", "supplement", 400, 80, 8, 6, 30, ["وی", "پروتئین وی", "مکمل پروتئین"], { scoop: 30 }),
  f("gainer", "گینر", "supplement", 380, 20, 65, 4, 100, ["کربو پروتئین"], { scoop: 50 }),
  f("creatine", "کراتین", "supplement", 0, 0, 0, 0, 5, [], { tsp: 5, scoop: 5 }),
];
