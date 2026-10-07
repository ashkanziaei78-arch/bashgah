import { test } from "node:test";
import assert from "node:assert/strict";
import { checkBannerLink, isExternal } from "../lib/banners.ts";

test("in-app paths and https links pass", () => {
  assert.deepEqual(checkBannerLink(""), { ok: true, url: null });
  assert.deepEqual(checkBannerLink("/app/events"), { ok: true, url: "/app/events" });
  assert.deepEqual(checkBannerLink("https://instagram.com/fitclub"), { ok: true, url: "https://instagram.com/fitclub" });
});

test("a bare domain gets https", () => {
  assert.deepEqual(checkBannerLink("instagram.com/fitclub"), { ok: true, url: "https://instagram.com/fitclub" });
});

test("dangerous or plain-http links are refused", () => {
  for (const bad of ["javascript:alert(1)", "data:text/html,x", "//evil.example", "http://plain.example", "ftp://x.example", "localhost"]) {
    assert.equal(checkBannerLink(bad).ok, false, bad);
  }
});

test("isExternal tells the two apart", () => {
  assert.equal(isExternal("https://a.example"), true);
  assert.equal(isExternal("/app"), false);
});
