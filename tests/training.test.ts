import { test } from "node:test";
import assert from "node:assert/strict";
import { muscleShare, weeklyConsistency } from "../lib/training.ts";
import { regionOf, suggestProgram, schemeFor, type LibraryExercise } from "../lib/program-suggest.ts";

test("muscle share counts completed sets in the window and folds the tail", () => {
  const today = "2026-10-07";
  const logs = [
    ...Array.from({ length: 10 }, () => ({ performed_on: "2026-10-01", completed: true, muscle: "سینه" })),
    ...Array.from({ length: 6 }, () => ({ performed_on: "2026-10-03", completed: true, muscle: "پا" })),
    { performed_on: "2026-10-03", completed: true, muscle: "ساعد" }, // under 5%
    { performed_on: "2026-10-03", completed: false, muscle: "پشت" }, // not done
    { performed_on: "2026-08-01", completed: true, muscle: "پشت" }, // too old
    ...Array.from({ length: 3 }, () => ({ performed_on: "2026-10-05", completed: true, muscle: null })),
  ];
  const s = muscleShare(logs, today);
  assert.equal(s.total, 20);
  assert.deepEqual(s.rows.map((r) => [r.muscle, r.count]), [["سینه", 10], ["پا", 6], ["سایر", 4]]);
});

test("weekly consistency and a streak that survives an empty current week", () => {
  // 2026-10-03 is a Saturday; today is the following Saturday morning
  const today = "2026-10-10";
  const w = weeklyConsistency(["2026-10-03", "2026-10-05", "2026-10-05", "2026-09-28", "2026-09-14"], today, 5);
  assert.deepEqual(w.series.map((x) => x.days), [1, 0, 1, 2, 0]);
  assert.equal(w.series[4].week, "2026-10-10");
  assert.equal(w.streak, 2);
});

test("regions from free-text muscle groups", () => {
  assert.equal(regionOf("سینه"), "chest");
  assert.equal(regionOf("پشت بازو"), "arms");
  assert.equal(regionOf("زیربغل"), "back");
  assert.equal(regionOf("سرشانه"), "shoulders");
  assert.equal(regionOf("همسترینگ"), "legs");
  assert.equal(regionOf("شکم"), "core");
  assert.equal(regionOf("چیز ناشناخته"), null);
});

const lib: LibraryExercise[] = [
  { id: "c1", name: "پرس سینه هالتر", muscle_group: "سینه", level: "beginner" },
  { id: "c2", name: "قفسه سینه دمبل", muscle_group: "سینه", level: "intermediate" },
  { id: "c3", name: "پرس بالا سینه", muscle_group: "سینه", level: "beginner" },
  { id: "s1", name: "پرس سرشانه", muscle_group: "شانه", level: "beginner" },
  { id: "a1", name: "پشت بازو سیم‌کش", muscle_group: "پشت بازو", level: "beginner" },
  { id: "l1", name: "اسکوات هالتر", muscle_group: "پا", level: "advanced" },
  { id: "l2", name: "پرس پا", muscle_group: "پا", level: "beginner" },
  { id: "b1", name: "زیربغل سیم‌کش", muscle_group: "زیربغل", level: "beginner" },
];

test("push day fills from the library, never repeats, reports gaps", () => {
  const r = suggestProgram(lib, { goal: "gain", split: "push", level: "beginner", seed: "x" });
  const ids = r.items.map((i) => i.exerciseId);
  assert.equal(new Set(ids).size, ids.length);
  // three chest slots, but a beginner may not get the intermediate fly
  // ahead of the beginner presses, and only two beginners + one intermediate exist
  assert.deepEqual(r.items.filter((i) => i.region === "chest").length, 3);
  assert.ok(r.missing.includes("shoulders")); // one shoulder lift for two slots
  assert.deepEqual(r.items[0], { ...r.items[0], sets: 4, reps: 8, rest: 120 });
});

test("level filters out lifts that are too hard", () => {
  const r = suggestProgram(lib, { goal: "strength", split: "legs", level: "beginner" });
  assert.ok(!r.items.some((i) => i.exerciseId === "l1"));
  assert.deepEqual(r.items.map((i) => i.exerciseId), ["l2"]);
  assert.ok(r.missing.includes("legs") && r.missing.includes("core"));
});

test("same seed, same draft; fat-loss adds cardio slot when available", () => {
  const a = suggestProgram(lib, { goal: "lose", split: "full", level: "advanced", seed: "m1" });
  const b = suggestProgram(lib, { goal: "lose", split: "full", level: "advanced", seed: "m1" });
  assert.deepEqual(a, b);
  assert.ok(a.missing.includes("cardio"));
  assert.deepEqual(schemeFor("lose", 0, "chest"), { sets: 3, reps: 15, rest: 45 });
});
