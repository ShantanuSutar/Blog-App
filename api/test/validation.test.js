import test from "node:test";
import assert from "node:assert/strict";

import { ApiError } from "../errors/ApiError.js";
import { validateRequest } from "../middleware/validate.js";
import {
  activityQuery,
  bookmarkCountsBody,
  commentBody,
  loginBody,
  postCreateBody,
  postIdParams,
  postsQuery,
  postUpdateBody,
  profileBody,
  reactionBody,
  registerBody,
} from "../validation/requests.js";

const expectValidationError = (callback, code) => {
  assert.throws(callback, (error) => {
    assert.equal(error instanceof ApiError, true);
    assert.equal(error.statusCode, 400);
    if (code) assert.equal(error.code, code);
    return true;
  });
};

test("registration validation normalizes safe values and rejects malformed input", () => {
  assert.deepEqual(registerBody({
    username: "  writer_1  ",
    email: "  Writer@Example.COM ",
    password: "secure password",
  }), {
    username: "writer_1",
    email: "writer@example.com",
    password: "secure password",
  });

  expectValidationError(
    () => registerBody({ username: "no spaces", email: "valid@example.com", password: "secret1" }),
    "FIELD_FORMAT_INVALID",
  );
  expectValidationError(
    () => registerBody({ username: "writer", email: "invalid", password: "secret1" }),
    "FIELD_FORMAT_INVALID",
  );
  expectValidationError(
    () => registerBody({ username: "writer", email: "valid@example.com", password: "short", admin: true }),
    "UNSUPPORTED_FIELDS",
  );
  expectValidationError(
    () => registerBody({ username: "writer", email: "valid@example.com", password: "é".repeat(40) }),
    "PASSWORD_TOO_LONG",
  );
});

test("login validation preserves existing short demo credentials", () => {
  assert.deepEqual(loginBody({ username: "demo", password: "demo" }), {
    username: "demo",
    password: "demo",
  });
  expectValidationError(() => loginBody({ username: {}, password: "demo" }), "FIELD_TYPE_INVALID");
});

test("post creation distinguishes drafts from published articles", () => {
  const draft = postCreateBody({ title: " Draft ", draft: true });
  assert.deepEqual(draft, {
    title: "Draft",
    desc: "",
    img: "",
    cat: "",
    draft: true,
    scheduled_publish_date: null,
    tags: [],
    featured: false,
  });

  expectValidationError(
    () => postCreateBody({ title: "Published", desc: "<p><br></p>", cat: "art" }),
    "POST_CONTENT_REQUIRED",
  );
  expectValidationError(
    () => postCreateBody({ title: "Published", desc: "<p>Body</p>" }),
    "FIELD_REQUIRED",
  );
});

test("post validation preserves legitimate Quill HTML and sanitizes plain metadata", () => {
  const richText = "<h2>Hello</h2><p><strong>Long-form body</strong></p>";
  const post = postCreateBody({
    title: "<strong>A title</strong>",
    desc: richText,
    cat: "scitech",
    tags: [" <em>Web</em> ", "Security"],
  });

  assert.equal(post.title, "A title");
  assert.equal(post.desc, richText);
  assert.deepEqual(post.tags, ["Web", "Security"]);
  expectValidationError(
    () => postCreateBody({ title: "Story", desc: richText, cat: "art", img: "javascript:alert(1)" }),
    "IMAGE_URL_INVALID",
  );
  expectValidationError(
    () => postCreateBody({ title: "Story", desc: richText, cat: "art", tags: ["Web", "web"] }),
    "TAGS_DUPLICATE",
  );
});

test("post updates use an allowlist and validate scheduling values", () => {
  assert.deepEqual(postUpdateBody({ draft: false }), { draft: false });
  assert.deepEqual(postUpdateBody({ scheduled_publish_date: null }), { scheduled_publish_date: null });
  expectValidationError(() => postUpdateBody({ uid: 9 }), "UNSUPPORTED_FIELDS");
  expectValidationError(() => postUpdateBody({ draft: "false" }), "FIELD_TYPE_INVALID");
  expectValidationError(
    () => postUpdateBody({ scheduled_publish_date: "2000-01-01T00:00:00.000Z" }),
    "DATE_NOT_FUTURE",
  );
});

test("comments are normalized as bounded plain text", () => {
  assert.deepEqual(commentBody({ comment: "  <strong>Hello</strong>  " }), { comment: "Hello" });
  expectValidationError(() => commentBody({ comment: "   " }), "FIELD_REQUIRED");
  expectValidationError(() => commentBody({ comment: { text: "Hello" } }), "FIELD_TYPE_INVALID");
  expectValidationError(() => commentBody({ comment: "x".repeat(10_001) }), "FIELD_TOO_LONG");
});

test("profile updates cannot mass-assign unsupported user fields", () => {
  assert.deepEqual(profileBody({ bio: "<b>Writer</b> & editor" }), { bio: "Writer & editor" });
  expectValidationError(() => profileBody({ username: "renamed" }), "UNSUPPORTED_FIELDS");
  expectValidationError(() => profileBody({}), "FIELD_REQUIRED");
});

test("route IDs and pagination are strictly bounded", () => {
  assert.deepEqual(postIdParams({ id: "42" }), { id: 42 });
  expectValidationError(() => postIdParams({ id: "4.2" }), "ID_INVALID");
  expectValidationError(() => postIdParams({ id: "-1" }), "ID_INVALID");

  assert.deepEqual(postsQuery({ page: "2", limit: "25", search: "  100%_coverage  ", cat: "art" }), {
    page: 2,
    limit: 25,
    search: "100%_coverage",
    cat: "art",
  });
  expectValidationError(() => postsQuery({ limit: "101" }), "ID_INVALID");
  expectValidationError(() => postsQuery({ cat: "unknown" }), "FIELD_VALUE_INVALID");
  expectValidationError(() => postsQuery({ sort: "newest" }), "UNSUPPORTED_FIELDS");
});

test("reaction validation requires one supported target and reaction", () => {
  assert.deepEqual(reactionBody({ postId: "8", reactionType: "love" }), {
    postId: 8,
    reactionType: "love",
  });
  expectValidationError(() => reactionBody({ postId: 8, commentId: 9 }), "REACTION_TARGET_INVALID");
  expectValidationError(() => reactionBody({ postId: 8, reactionType: "angry" }), "FIELD_VALUE_INVALID");
});

test("bulk bookmark validation bounds and deduplicates IDs", () => {
  assert.deepEqual(bookmarkCountsBody({ postIds: [1, "2", 1] }), { postIds: [1, 2] });
  expectValidationError(() => bookmarkCountsBody({ postIds: [] }), "POST_IDS_INVALID");
  expectValidationError(
    () => bookmarkCountsBody({ postIds: Array.from({ length: 101 }, (_, index) => index + 1) }),
    "ARRAY_TOO_LARGE",
  );
});

test("activity filters and pagination accept only supported values", () => {
  assert.deepEqual(activityQuery({}), { filter: "all" });
  assert.deepEqual(activityQuery({ page: "2", limit: "20", filter: "comments" }), {
    page: 2,
    limit: 20,
    filter: "comments",
  });
  expectValidationError(() => activityQuery({ filter: "admin" }), "FIELD_VALUE_INVALID");
});

test("validation middleware replaces inputs with normalized values", () => {
  const req = { body: { username: " demo ", password: "demo" }, params: {}, query: {} };
  let nextError;
  validateRequest({ body: loginBody })(req, {}, (error) => {
    nextError = error;
  });

  assert.equal(nextError, undefined);
  assert.deepEqual(req.body, { username: "demo", password: "demo" });

  const invalidReq = { body: { username: "demo" }, params: {}, query: {} };
  validateRequest({ body: loginBody })(invalidReq, {}, (error) => {
    nextError = error;
  });
  assert.equal(nextError instanceof ApiError, true);
});
