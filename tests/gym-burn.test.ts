import { test } from "node:test";
import assert from "node:assert/strict";
import { kcalFor, eventMinutes, classEntry, eventEntry, summariseBurn, EVENT_CAP_MIN, type BurnEntry } from "../lib/gym-burn.ts";

test("kcalFor uses the MET formula and refuses to guess without a weight", () => {
  // 8 MET × 3.5 × 80 kg × 60 min / 200
  assert.equal(kcalFor(8, 60, 80), 672);
  assert.equal(kcalFor(8, 60, 0), 0);
  assert.equal(kcalFor(8, 0, 80), 0);
});

test("eventMinutes caps long events and defaults open-ended ones", () => {
  assert.equal(eventMinutes("2026-10-01T10:00:00Z", "2026-10-01T11:00:00Z"), 60);
  assert.equal(eventMinutes("2026-10-01T08:00:00Z", "2026-10-01T18:00:00Z"), EVENT_CAP_MIN);
  assert.equal(eventMinutes("2026-10-01T08:00:00Z", null), 90);
  assert.equal(eventMinutes("2026-10-01T08:00:00Z", "2026-10-01T07:00:00Z"), 90);
});

test("a WOD burns far more than watching football by the pool", () => {
  const wod = classEntry({ kind: "wod", title: "WOD", duration_min: 60 }, "2026-10-01", 75);
  const match = eventEntry(
    { kind: "social", title: "فوتبال", starts_at: "2026-10-01T18:00:00Z", ends_at: "2026-10-01T20:00:00Z" },
    "2026-10-01",
    75
  );
  // Twice as long by the pool, still well under half the burn.
  assert.ok(wod.kcal > match.kcal * 2);
  assert.equal(match.minutes, 120);
});

test("summariseBurn totals the window and ignores anything outside it", () => {
  const e = (day: string, source: BurnEntry["source"], kcal: number): BurnEntry => ({ day, source, kcal, minutes: 30, label: "" });
  const s = summariseBurn(
    [e("2026-10-07", "workout", 300), e("2026-10-07", "class", 200), e("2026-10-03", "event", 100), e("2026-09-20", "workout", 999)],
    "2026-10-07"
  );
  assert.equal(s.today, 500);
  assert.equal(s.total, 600);
  assert.equal(s.activeDays, 2);
  assert.equal(s.byDay.length, 7);
  assert.equal(s.byDay[0].day, "2026-10-01");
  assert.deepEqual(s.bySource, { workout: 300, class: 200, event: 100 });
});
