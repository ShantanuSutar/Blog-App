import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { requireAuth } from "../middleware/auth.js";
import { escapeHtml, sanitizePlainText, sanitizeRichText } from "../utils/content.js";
import { isPublishedPost, normalizeSchedule } from "../utils/postState.js";

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
