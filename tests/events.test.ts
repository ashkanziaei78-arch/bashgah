import { test } from "node:test";
import assert from "node:assert/strict";
import { parseScore, formatScore, eventAction, eventErrorMessage, defaultLowerIsBetter, type ListedEvent } from "../lib/events.ts";

test("scores parse from what a coach types", () => {
  assert.equal(parseScore("time", "12:34"), 754);
  assert.equal(parseScore("time", "۱:۰۲:۰۳"), 3723);
  assert.equal(parseScore("time", "95"), 95);
  assert.equal(parseScore("time", "1:75"), null);
  assert.equal(parseScore("weight", "۱۲۲٫۵"), 122.5);
  assert.equal(parseScore("reps", "-3"), null);
  assert.equal(parseScore("reps", ""), null);
  assert.equal(parseScore("points", "abc"), null);
});

test("scores format the way people say them", () => {
  assert.equal(formatScore("time", 754), "12:34");
  assert.equal(formatScore("time", 3723), "1:02:03");
  assert.equal(formatScore("weight", 122.5), "122.5 کیلو");
  assert.equal(formatScore("reps", 150), "150 تکرار");
  assert.equal(defaultLowerIsBetter("time"), true);
  assert.equal(defaultLowerIsBetter("reps"), false);
});

const base: ListedEvent = {
  id: "e", title: "t", description: null, kind: "crossfit", is_competition: true,
  starts_at: "2026-10-20T10:00:00Z", ends_at: null, location: null, capacity: 10,
  register_until: "2026-10-18T20:00:00Z", fee_toman: null, divisions: [], score_kind: "time",
  lower_is_better: true, status: "published", registered: 3, results: 0, my_status: null, my_division: null,
};
const now = new Date("2026-10-10T10:00:00Z");

test("the button mirrors register_event()", () => {
  assert.deepEqual(eventAction(base, now), { kind: "register" });
  assert.deepEqual(eventAction({ ...base, my_status: "registered" }, now), { kind: "registered" });
  assert.deepEqual(eventAction({ ...base, registered: 10 }, now), { kind: "closed", reason: "full" });
  assert.deepEqual(eventAction(base, new Date("2026-10-19T10:00:00Z")), { kind: "closed", reason: "deadline" });
  assert.deepEqual(eventAction(base, new Date("2026-10-21T10:00:00Z")), { kind: "closed", reason: "started" });
  assert.deepEqual(eventAction({ ...base, status: "cancelled" }, now), { kind: "closed", reason: "cancelled" });
  assert.deepEqual(eventAction({ ...base, capacity: null, registered: 999 }, now), { kind: "register" });
});

test("errors read as Persian", () => {
  assert.match(eventErrorMessage("event_full"), /ظرفیت/);
  assert.equal(eventErrorMessage("weird"), "انجام نشد. دوباره تلاش کنید.");
});
