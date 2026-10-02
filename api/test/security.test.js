import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { requireAuth, requireSelf } from "../middleware/auth.js";
import { escapeHtml, sanitizePlainText, sanitizeRichText } from "../utils/content.js";
import { isPublishedPost, normalizeSchedule } from "../utils/postState.js";
import { getPagination, parsePositiveInteger } from "../utils/request.js";
import { isActivityType } from "../services/activity.js";

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test("sanitizeRichText removes executable markup and unsafe URLs", () => {
  const result = sanitizeRichText(
    '<p onclick="alert(1)">Safe</p><script>alert(1)</script>' +
      '<img src="x" onerror="alert(1)">' +
      '<a href="javascript:alert(1)">bad</a>' +
      '<a href="https://example.com" target="_blank">good</a>'
  );

  assert.equal(result.includes("script"), false);
  assert.equal(result.includes("onerror"), false);
  assert.equal(result.includes("onclick"), false);
  assert.equal(result.includes("javascript:"), false);
  assert.match(result, /href="https:\/\/example\.com"/);
  assert.match(result, /rel="noopener noreferrer nofollow"/);
});

test("sanitizePlainText strips tags", () => {
  assert.equal(sanitizePlainText("<strong>Title</strong>"), "Title");
  assert.equal(sanitizePlainText("Research & Development"), "Research & Development");
  assert.equal(escapeHtml(sanitizePlainText("<strong>R&D</strong>")), "R&amp;D");
});

test("requireAuth accepts a valid bearer token", () => {
  process.env.JWT_SECRET = "test-secret-that-is-long-enough";
  const token = jwt.sign({ id: 42 }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = createResponse();
  let called = false;

  requireAuth(req, res, () => {
    called = true;
  });

  assert.equal(called, true);
  assert.equal(req.user.id, 42);
  assert.equal(res.statusCode, 200);
});

test("requireAuth rejects missing and invalid bearer tokens", () => {
  process.env.JWT_SECRET = "test-secret-that-is-long-enough";

  for (const authorization of [undefined, "Bearer invalid-token"]) {
    const req = { headers: { authorization } };
    const res = createResponse();
    let called = false;

    requireAuth(req, res, () => {
      called = true;
    });

    assert.equal(called, false);
    assert.equal(res.statusCode, 401);
  }
});

test("requireSelf rejects cross-account profile mutations", () => {
  const allowedRequest = { user: { id: 42 }, params: { id: "42" } };
  const deniedRequest = { user: { id: 42 }, params: { id: "7" } };
  let allowed = false;

  requireSelf(allowedRequest, createResponse(), () => {
    allowed = true;
  });
  const deniedResponse = createResponse();
  requireSelf(deniedRequest, deniedResponse, () => assert.fail("must not call next"));

  assert.equal(allowed, true);
  assert.equal(deniedResponse.statusCode, 403);
});

test("future publication dates always resolve to scheduled state", () => {
  const now = Date.parse("2026-09-21T12:00:00.000Z");
  assert.deepEqual(normalizeSchedule("2026-09-22T12:00:00.000Z", now), {
    date: "2026-09-22T12:00:00.000Z",
    isScheduled: true,
  });
  assert.deepEqual(normalizeSchedule("2026-09-20T12:00:00.000Z", now), {
    date: null,
    isScheduled: false,
  });
});

test("published state excludes drafts and future scheduled posts", () => {
  const now = Date.parse("2026-09-21T12:00:00.000Z");
  assert.equal(isPublishedPost({ draft: true, scheduled_publish_date: null }, now), false);
  assert.equal(
    isPublishedPost({ draft: false, scheduled_publish_date: "2026-09-22T12:00:00.000Z" }, now),
    false
  );
  assert.equal(isPublishedPost({ draft: false, scheduled_publish_date: null }, now), true);
});

test("request helpers reject invalid IDs and bound pagination", () => {
  assert.equal(parsePositiveInteger("42"), 42);
  assert.equal(parsePositiveInteger("4.2"), null);
  assert.equal(parsePositiveInteger("-1"), null);

  assert.deepEqual(getPagination({ page: "2", limit: "500" }), {
    page: 2,
    limit: 100,
    offset: 100,
  });
  assert.deepEqual(getPagination({ page: "invalid", limit: "0" }), {
    page: 1,
    limit: 20,
    offset: 0,
  });
});

test("activity types are limited to supported application events", () => {
  for (const activityType of ["post", "comment", "reaction", "follow"]) {
    assert.equal(isActivityType(activityType), true);
  }
  assert.equal(isActivityType("admin"), false);
});
