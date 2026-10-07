import { test } from "node:test";
import assert from "node:assert/strict";
import {
  jalali, jalaliMonthKey, lastMonths, revenueByMonth, change, attendanceGrid,
  memberCounts, renewalRate, classStats, type MembershipRow,
} from "../lib/analytics.ts";

test("Jalali month on the Tehran calendar", () => {
  // 1 Mehr 1405 = 23 September 2026
  assert.deepEqual(jalali("2026-09-23"), { year: 1405, month: 7, day: 1 });
  assert.equal(jalaliMonthKey("2026-09-22"), "1405-06");
  // 21:00 UTC on 22 Sep is already 00:30 on 1 Mehr in Tehran
  assert.equal(jalaliMonthKey("2026-09-22T21:00:00Z"), "1405-07");
});

test("lastMonths wraps across the Jalali new year", () => {
  assert.deepEqual(lastMonths(new Date("2026-04-25T08:00:00Z"), 3), ["1404-12", "1405-01", "1405-02"]);
});

test("revenue per month nets refunds and keeps empty months", () => {
  const rows = revenueByMonth(
    [
      { amount_toman: 4_000_000, paid_at: "2026-10-01T08:00:00Z" }, // Mehr
      { amount_toman: 2_000_000, paid_at: "2026-10-05T08:00:00Z" },
      { amount_toman: -500_000, paid_at: "2026-10-06T08:00:00Z" },
      { amount_toman: 3_000_000, paid_at: "2026-08-30T08:00:00Z" }, // Shahrivar
      { amount_toman: 9_000_000, paid_at: "2025-01-01T08:00:00Z" }, // out of range
    ],
    new Date("2026-10-07T08:00:00Z"),
    3
  );
  assert.deepEqual(rows.map((r) => [r.label, r.total, r.count]), [
    ["مرداد", 0, 0], ["شهریور", 3_000_000, 1], ["مهر", 5_500_000, 3],
  ]);
  assert.equal(change(5_500_000, 3_000_000), 83);
  assert.equal(change(5, 0), null);
});

test("attendance grid uses Tehran weekday and hour", () => {
  // Saturday 3 Oct 2026, 18:10 Tehran = 14:40 UTC
  const g = attendanceGrid([
    { at: "2026-10-03T14:40:00Z" },
    { at: "2026-10-03T14:55:00Z" },
    { at: "2026-10-09T02:00:00Z" }, // Friday 05:30 → folds into 06:00
  ]);
  assert.equal(g.grid[0][18 - 6], 2);
  assert.deepEqual(g.peak, { weekday: 0, hour: 18, count: 2 });
  assert.equal(g.grid[6][0], 1);
  assert.deepEqual(g.byWeekday, [2, 0, 0, 0, 0, 0, 1]);
});

const m = (student_id: string, status: MembershipRow["status"], started_on: string, expires_on: string): MembershipRow =>
  ({ student_id, status, started_on, expires_on });

test("member counts: active, frozen, expiring, lapsed", () => {
  const today = "2026-10-07";
  const c = memberCounts([
    m("a", "active", "2026-09-20", "2026-10-20"),
    m("b", "active", "2026-09-10", "2026-10-10"), // expiring in 3 days
    m("c", "frozen", "2026-09-01", "2026-10-30"),
    m("d", "expired", "2026-08-20", "2026-09-20"), // lapsed 17 days ago
    m("e", "expired", "2026-06-01", "2026-07-01"), // gone too long to count
    m("f", "expired", "2026-08-20", "2026-09-25"),
    m("f", "active", "2026-09-25", "2026-10-25"), // renewed, not lapsed
  ], today);
  assert.deepEqual(c, { active: 3, frozen: 1, expiring: 1, lapsed: 1 });
});

test("renewal rate counts a new subscription within two weeks", () => {
  const today = "2026-10-07";
  const r = renewalRate([
    m("a", "expired", "2026-08-01", "2026-09-01"),
    m("a", "active", "2026-09-05", "2026-10-05"), // renewed 4 days later
    m("b", "expired", "2026-08-01", "2026-09-01"), // never came back
    m("c", "expired", "2026-07-25", "2026-08-25"),
    m("c", "active", "2026-10-01", "2026-10-31"), // came back too late
    m("d", "expired", "2026-09-01", "2026-10-01"), // still inside the grace window
  ], today);
  assert.deepEqual(r, { eligible: 3, renewed: 1, rate: 33 });
});

test("class stats ignore cancelled sessions and cap over-booking", () => {
  const s = classStats([
    { title: "HIIT", capacity: 10, cancelled_at: null, statuses: ["attended", "attended", "no_show", "booked", "cancelled"] },
    { title: "HIIT", capacity: 2, cancelled_at: null, statuses: ["attended", "attended", "booked"] },
    { title: "Yoga", capacity: 10, cancelled_at: null, statuses: ["attended"] },
    { title: "Spin", capacity: 10, cancelled_at: "x", statuses: [] },
  ]);
  assert.equal(s.sessions, 3);
  assert.equal(s.fill, Math.round(((4 + 2 + 1) / 22) * 100));
  assert.equal(s.showUp, 83); // 5 came, 1 did not
  assert.equal(s.ranking[0].title, "HIIT");
});
