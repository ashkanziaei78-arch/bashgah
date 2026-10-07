import { test } from "node:test";
import assert from "node:assert/strict";
import { normalisePhone, followUp, conversion, sortLeads } from "../lib/leads.ts";

test("phone numbers typed on a Persian keyboard", () => {
  assert.equal(normalisePhone("۰۹۱۲ ۱۲۳-۴۵۶۷"), "09121234567");
  assert.equal(normalisePhone("+98 912 123 4567"), "+989121234567");
  assert.equal(normalisePhone("12"), null);
  assert.equal(normalisePhone(""), null);
});

test("follow-up state", () => {
  assert.equal(followUp("2026-10-06", "2026-10-07"), "overdue");
  assert.equal(followUp("2026-10-07", "2026-10-07"), "today");
  assert.equal(followUp("2026-10-09", "2026-10-07"), "upcoming");
  assert.equal(followUp(null, "2026-10-07"), null);
});

test("conversion ignores open leads", () => {
  assert.deepEqual(conversion([{ status: "won" }, { status: "lost" }, { status: "lost" }, { status: "new" }]), { decided: 3, won: 1, rate: 33 });
  assert.deepEqual(conversion([{ status: "new" }]), { decided: 0, won: 0, rate: null });
});

test("the desk works overdue calls first", () => {
  const today = "2026-10-07";
  const rows = sortLeads([
    { id: "done", status: "won" as const, follow_up_on: "2026-10-01", created_at: "2026-10-01" },
    { id: "later", status: "new" as const, follow_up_on: "2026-10-10", created_at: "2026-10-05" },
    { id: "late", status: "contacted" as const, follow_up_on: "2026-10-05", created_at: "2026-10-01" },
    { id: "nodate", status: "new" as const, follow_up_on: null, created_at: "2026-10-06" },
    { id: "today", status: "trial" as const, follow_up_on: "2026-10-07", created_at: "2026-10-02" },
  ], today);
  assert.deepEqual(rows.map((r) => r.id), ["late", "today", "later", "nodate", "done"]);
});
