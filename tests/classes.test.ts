import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tehranDay, tehranClock, tehranWeek, groupByDay, seats, classAction, classErrorMessage,
  type ScheduledClass,
} from "../lib/classes.ts";

const base: ScheduledClass = {
  id: "1", series_id: null, title: "HIIT", description: null, kind: "hiit",
  coach_id: null, coach_name: null, starts_at: "2026-10-10T15:00:00Z", duration_min: 60,
  capacity: 10, location: null, cancelled_at: null, booked: 3, waitlisted: 0,
  my_status: null, my_position: null,
};
const opts = { cancelWindowHours: 2, horizonDays: 14 };

test("Tehran day and clock use +03:30", () => {
  // 21:00 UTC is 00:30 the next morning in Tehran
  assert.equal(tehranDay("2026-10-09T21:00:00Z"), "2026-10-10");
  assert.equal(tehranClock("2026-10-09T21:00:00Z"), "00:30");
  assert.equal(tehranDay("2026-10-09T20:29:00Z"), "2026-10-09");
});

test("the week starts on Saturday in Tehran", () => {
  // 2026-10-07 is a Wednesday
  const w = tehranWeek(new Date("2026-10-07T08:00:00Z"));
  assert.equal(w.days[0], "2026-10-03"); // Saturday
  assert.equal(w.days[6], "2026-10-09"); // Friday
  assert.equal(w.from, "2026-10-03T00:00:00+03:30");
  assert.equal(w.to, "2026-10-10T00:00:00+03:30");
  // Late Friday night UTC is already Saturday in Tehran: a new week
  const sat = tehranWeek(new Date("2026-10-09T21:00:00Z"));
  assert.equal(sat.days[0], "2026-10-10");
  assert.equal(tehranWeek(new Date("2026-10-07T08:00:00Z"), 1).days[0], "2026-10-10");
});

test("groupByDay sorts and buckets by Tehran day", () => {
  const g = groupByDay([
    { starts_at: "2026-10-10T15:00:00Z" },
    { starts_at: "2026-10-09T21:30:00Z" }, // Saturday 01:00 Tehran
    { starts_at: "2026-10-09T05:00:00Z" },
  ]);
  assert.deepEqual([...g.keys()], ["2026-10-09", "2026-10-10"]);
  assert.equal(g.get("2026-10-10")!.length, 2);
});

test("seats never go negative or over 100%", () => {
  assert.deepEqual(seats({ booked: 3, capacity: 10 }), { left: 7, full: false, fill: 0.3 });
  assert.deepEqual(seats({ booked: 12, capacity: 10 }), { left: 0, full: true, fill: 1 });
});

test("classAction mirrors the database rules", () => {
  const now = new Date("2026-10-10T10:00:00Z"); // five hours before base
  assert.deepEqual(classAction(base, now, opts), { kind: "book" });
  assert.deepEqual(classAction({ ...base, booked: 10 }, now, opts), { kind: "join_waitlist" });
  assert.deepEqual(classAction({ ...base, my_status: "booked" }, now, opts), { kind: "cancel" });
  assert.deepEqual(
    classAction({ ...base, my_status: "booked" }, new Date("2026-10-10T13:30:00Z"), opts),
    { kind: "locked", reason: "too_late" }
  );
  assert.deepEqual(
    classAction({ ...base, my_status: "waitlisted" }, new Date("2026-10-10T14:59:00Z"), opts),
    { kind: "leave_waitlist" }
  );
  assert.deepEqual(classAction({ ...base, cancelled_at: "x" }, now, opts), { kind: "locked", reason: "cancelled" });
  assert.deepEqual(classAction(base, new Date("2026-10-10T15:00:00Z"), opts), { kind: "locked", reason: "started" });
  assert.deepEqual(classAction(base, new Date("2026-09-20T10:00:00Z"), opts), { kind: "locked", reason: "too_early" });
});

test("database errors become Persian sentences", () => {
  assert.match(classErrorMessage("no_membership"), /اشتراک فعال/);
  assert.match(classErrorMessage("ERROR: too_late"), /زمان لغو/);
  assert.equal(classErrorMessage("something odd"), "انجام نشد. دوباره تلاش کنید.");
});
