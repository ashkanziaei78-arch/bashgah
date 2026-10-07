import { test } from "node:test";
import assert from "node:assert/strict";
import { energyDay, balanceVerdict } from "../lib/energy.ts";

test("the analyser's resting rate wins over the estimate", () => {
  const d = energyDay({ target: 2400, analyzerBmr: 1740, estimatedBmr: 1800, gymBurnToday: 420 })!;
  assert.equal(d.bmrSource, "analyzer");
  assert.equal(d.bmr, 1740);
  assert.equal(d.baseline, 2088);
  assert.equal(d.totalOut, 2508);
  assert.equal(d.balance, -108);
});

test("falls back to the estimate, and needs a target", () => {
  assert.equal(energyDay({ target: 2000, analyzerBmr: null, estimatedBmr: 1500, gymBurnToday: 0 })!.bmrSource, "estimate");
  assert.equal(energyDay({ target: 0, analyzerBmr: 1500, estimatedBmr: null, gymBurnToday: 0 }), null);
  assert.equal(energyDay({ target: 2000, analyzerBmr: null, estimatedBmr: null, gymBurnToday: 0 }), null);
});

test("the verdict reads the balance against the goal", () => {
  assert.equal(balanceVerdict(-300, "lose").tone, "ok");
  assert.equal(balanceVerdict(200, "lose").tone, "warn");
  assert.equal(balanceVerdict(300, "gain").tone, "ok");
  assert.equal(balanceVerdict(100, "maintain").tone, "ok");
  assert.equal(balanceVerdict(-600, "maintain").tone, "warn");
});
