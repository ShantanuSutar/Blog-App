import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import jwt from "jsonwebtoken";

import {
  apiRequest,
  assertIsolatedTestDatabase,
  createPost,
  db,
  expectApiError,
  registerUser,
  resetDatabase,
  startApiServer,
} from "../helpers/integration.js";

let api;

test.before(async () => {
  await assertIsolatedTestDatabase();
  api = await startApiServer();
});

test.beforeEach(async () => {
  await resetDatabase();
});

test.after(async () => {
  await api?.close();
  await db.end();
});

test("the harness runs migrations in an isolated temporary schema", async () => {
  const environment = await assertIsolatedTestDatabase();
  assert.match(environment.schema, /^unsaid_test_/);

  const migrationResult = await db.query("SELECT name FROM schema_migrations ORDER BY name");
  assert.deepEqual(
    migrationResult.rows.map(({ name }) => name),
    [
      "001_initial_schema.sql",
      "002_post_state_invariant.sql",
      "003_query_indexes_and_integrity.sql",
      "004_validate_post_state_and_draft_index.sql",
      "005_post_full_text_search.sql",
      "006_comment_pagination_index.sql",
    ],
  );
});

test("registration and login work without exposing password data", async () => {
  const user = await registerUser(api.baseUrl, "auth");
  assert.ok(user.token);

  const duplicate = await apiRequest(api.baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      username: user.username.toUpperCase(),
      email: "another@example.test",
      password: user.password,
    },
  });
  expectApiError(duplicate, { status: 409, code: "USER_EXISTS" });

  const invalidPassword = await apiRequest(api.baseUrl, "/api/auth/login", {
    method: "POST",
    body: { username: user.username, password: "incorrect password" },
  });
  const missingAccount = await apiRequest(api.baseUrl, "/api/auth/login", {
    method: "POST",
    body: { username: "missing_writer", password: "incorrect password" },
  });
  expectApiError(invalidPassword, { status: 401, code: "AUTH_INVALID_CREDENTIALS" });
  expectApiError(missingAccount, { status: 401, code: "AUTH_INVALID_CREDENTIALS" });
  assert.equal(invalidPassword.body.message, missingAccount.body.message);

  const stored = await db.query(
    "SELECT username, email, password FROM users WHERE id = $1",
    [user.id],
  );
  assert.notEqual(stored.rows[0].password, user.password);
  assert.equal(JSON.stringify(invalidPassword.body).includes(stored.rows[0].password), false);
});

test("protected routes reject missing, malformed, invalid, and expired access tokens", async () => {
  const user = await registerUser(api.baseUrl, "tokens");
  const missing = await apiRequest(api.baseUrl, "/api/posts/drafts/user");
  expectApiError(missing, { status: 401, code: "AUTH_REQUIRED" });

  const malformed = await apiRequest(api.baseUrl, "/api/posts/drafts/user", {
    headers: { Authorization: "Token not-a-bearer-token" },
  });
  expectApiError(malformed, { status: 401, code: "AUTH_HEADER_INVALID" });

  const invalid = await apiRequest(api.baseUrl, "/api/posts/drafts/user", {
    token: "not-a-jwt",
  });
  expectApiError(invalid, { status: 401, code: "AUTH_TOKEN_INVALID" });

  const expiredToken = jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET,
    { algorithm: "HS256", expiresIn: -1 },
  );
  const expired = await apiRequest(api.baseUrl, "/api/posts/drafts/user", {
    token: expiredToken,
  });
  expectApiError(expired, { status: 401, code: "AUTH_TOKEN_EXPIRED" });

  const authorized = await apiRequest(api.baseUrl, "/api/posts/drafts/user", {
    token: user.token,
  });
  assert.equal(authorized.response.status, 200, JSON.stringify(authorized.body));
});

test("post CRUD enforces ownership and public visibility", async () => {
  const owner = await registerUser(api.baseUrl, "post_owner");
  const other = await registerUser(api.baseUrl, "post_other");
  const created = await createPost(api.baseUrl, owner.token, {
    title: "Owner's published story",
    tags: ["security", "postgres"],
  });

  const read = await apiRequest(api.baseUrl, `/api/posts/${created.id}`);
  assert.equal(read.response.status, 200, JSON.stringify(read.body));
  assert.equal(read.body.title, "Owner's published story");
  assert.equal(read.body.username, owner.username);

  const forbiddenEdit = await apiRequest(api.baseUrl, `/api/posts/${created.id}`, {
    method: "PUT",
    token: other.token,
    body: { title: "Stolen title" },
  });
  expectApiError(forbiddenEdit, { status: 404, code: "POST_NOT_FOUND" });

  const forbiddenDelete = await apiRequest(api.baseUrl, `/api/posts/${created.id}`, {
    method: "DELETE",
    token: other.token,
  });
  expectApiError(forbiddenDelete, { status: 404, code: "POST_NOT_FOUND" });

  const update = await apiRequest(api.baseUrl, `/api/posts/${created.id}`, {
    method: "PUT",
    token: owner.token,
    body: { title: "Updated by the owner" },
  });
  assert.equal(update.response.status, 200, JSON.stringify(update.body));

  const deletion = await apiRequest(api.baseUrl, `/api/posts/${created.id}`, {
    method: "DELETE",
    token: owner.token,
  });
  assert.equal(deletion.response.status, 200, JSON.stringify(deletion.body));
  const missing = await apiRequest(api.baseUrl, `/api/posts/${created.id}`);
  expectApiError(missing, { status: 404, code: "POST_NOT_FOUND" });
});

test("drafts and scheduled posts stay private and remain owner-scoped", async () => {
  const owner = await registerUser(api.baseUrl, "private_owner");
  const other = await registerUser(api.baseUrl, "private_other");
  const draft = await createPost(api.baseUrl, owner.token, {
    title: "Private draft",
    desc: "",
    cat: "",
    draft: true,
  });
  const scheduled = await createPost(api.baseUrl, owner.token, {
    title: "Future story",
    scheduled_publish_date: "2099-01-01T12:00:00.000Z",
  });

  for (const post of [draft, scheduled]) {
    const publicRead = await apiRequest(api.baseUrl, `/api/posts/${post.id}`);
    expectApiError(publicRead, { status: 404, code: "POST_NOT_FOUND" });

    const otherEdit = await apiRequest(api.baseUrl, `/api/posts/${post.id}/edit`, {
      token: other.token,
    });
    expectApiError(otherEdit, { status: 404, code: "POST_NOT_FOUND" });
  }

  const drafts = await apiRequest(api.baseUrl, "/api/posts/drafts/user", {
    token: owner.token,
  });
  assert.deepEqual(drafts.body.posts.map(({ id }) => id), [draft.id]);

  const scheduledPosts = await apiRequest(api.baseUrl, "/api/posts/scheduled/user", {
    token: owner.token,
  });
  assert.deepEqual(scheduledPosts.body.posts.map(({ id }) => id), [scheduled.id]);

  const publish = await apiRequest(api.baseUrl, `/api/posts/${draft.id}`, {
    method: "PUT",
    token: owner.token,
    body: {
      draft: false,
      desc: "<p>The finished draft.</p>",
      cat: "technology",
    },
  });
  assert.equal(publish.response.status, 200, JSON.stringify(publish.body));
  assert.equal(publish.body.status, "published");

  const publicRead = await apiRequest(api.baseUrl, `/api/posts/${draft.id}`);
  assert.equal(publicRead.response.status, 200, JSON.stringify(publicRead.body));

  const unauthorizedDelete = await apiRequest(api.baseUrl, `/api/posts/${scheduled.id}`, {
    method: "DELETE",
    token: other.token,
  });
  expectApiError(unauthorizedDelete, { status: 404, code: "POST_NOT_FOUND" });

  const ownerDelete = await apiRequest(api.baseUrl, `/api/posts/${scheduled.id}`, {
    method: "DELETE",
    token: owner.token,
  });
  assert.equal(ownerDelete.response.status, 200, JSON.stringify(ownerDelete.body));
  const afterDelete = await apiRequest(api.baseUrl, "/api/posts/scheduled/user", {
    token: owner.token,
  });
  assert.equal(afterDelete.body.pagination.total, 0);
});

test("comments validate input, require published posts, and use the authenticated identity", async () => {
  const author = await registerUser(api.baseUrl, "comment_author");
  const commenter = await registerUser(api.baseUrl, "commenter");
  const post = await createPost(api.baseUrl, author.token);

  const unauthenticated = await apiRequest(api.baseUrl, `/api/comments/${post.id}`, {
    method: "POST",
    body: { comment: "Hello" },
  });
  expectApiError(unauthenticated, { status: 401, code: "AUTH_REQUIRED" });

  const empty = await apiRequest(api.baseUrl, `/api/comments/${post.id}`, {
    method: "POST",
    token: commenter.token,
    body: { comment: "   " },
  });
  assert.equal(empty.response.status, 400, JSON.stringify(empty.body));

  const invalidId = await apiRequest(api.baseUrl, "/api/comments/not-an-id", {
    method: "POST",
    token: commenter.token,
    body: { comment: "Hello" },
  });
  assert.equal(invalidId.response.status, 400, JSON.stringify(invalidId.body));

  const created = await apiRequest(api.baseUrl, `/api/comments/${post.id}`, {
    method: "POST",
    token: commenter.token,
    body: { comment: "  A useful <b>comment</b>.  " },
  });
  assert.equal(created.response.status, 201, JSON.stringify(created.body));

  const stored = await db.query("SELECT cuserid, comment FROM comments WHERE id = $1", [created.body.id]);
  assert.equal(stored.rows[0].cuserid, commenter.id);
  assert.equal(stored.rows[0].comment, "A useful comment.");

  const comments = await apiRequest(api.baseUrl, `/api/comments/${post.id}`);
  assert.equal(comments.response.status, 200, JSON.stringify(comments.body));
  assert.equal(comments.body.comments[0].username, commenter.username);
  assert.equal(comments.body.pagination.total, 1);
});

test("bookmarks, reactions, follows, and activity are identity-scoped", async () => {
  const author = await registerUser(api.baseUrl, "social_author");
  const actor = await registerUser(api.baseUrl, "social_actor");
  const post = await createPost(api.baseUrl, author.token);

  const firstBookmark = await apiRequest(api.baseUrl, "/api/bookmarks", {
    method: "POST",
    token: actor.token,
    body: { postId: post.id },
  });
  assert.equal(firstBookmark.response.status, 200, JSON.stringify(firstBookmark.body));
  const duplicateBookmark = await apiRequest(api.baseUrl, "/api/bookmarks", {
    method: "POST",
    token: actor.token,
    body: { postId: post.id },
  });
  assert.equal(duplicateBookmark.body.message, "Already bookmarked");

  const actorBookmarks = await apiRequest(api.baseUrl, "/api/bookmarks", {
    token: actor.token,
  });
  const authorBookmarks = await apiRequest(api.baseUrl, "/api/bookmarks", {
    token: author.token,
  });
  assert.equal(actorBookmarks.body.pagination.total, 1);
  assert.equal(authorBookmarks.body.pagination.total, 0);

  const reaction = await apiRequest(api.baseUrl, "/api/reactions", {
    method: "POST",
    token: actor.token,
    body: { postId: post.id, reactionType: "love" },
  });
  assert.equal(reaction.body.action, "added");
  const forbiddenReactionDelete = await apiRequest(
    api.baseUrl,
    `/api/reactions/${reaction.body.reactionId}`,
    { method: "DELETE", token: author.token },
  );
  expectApiError(forbiddenReactionDelete, { status: 404, code: "REACTION_NOT_FOUND" });

  const duplicateReaction = await apiRequest(api.baseUrl, "/api/reactions", {
    method: "POST",
    token: actor.token,
    body: { postId: post.id, reactionType: "love" },
  });
  assert.equal(duplicateReaction.body.action, "removed");
  assert.equal(
    Number((await db.query("SELECT COUNT(*) FROM reactions WHERE user_id = $1", [actor.id])).rows[0].count),
    0,
  );

  const follow = await apiRequest(api.baseUrl, `/api/follows/${author.id}`, {
    method: "POST",
    token: actor.token,
  });
  assert.equal(follow.body.following, true);
  const unfollow = await apiRequest(api.baseUrl, `/api/follows/${author.id}`, {
    method: "POST",
    token: actor.token,
  });
  assert.equal(unfollow.body.following, false);
  const refollow = await apiRequest(api.baseUrl, `/api/follows/${author.id}`, {
    method: "POST",
    token: actor.token,
  });
  assert.equal(refollow.body.following, true);
  const selfFollow = await apiRequest(api.baseUrl, `/api/follows/${actor.id}`, {
    method: "POST",
    token: actor.token,
  });
  expectApiError(selfFollow, { status: 403, code: "SELF_FOLLOW_FORBIDDEN" });

  const followers = await apiRequest(api.baseUrl, `/api/follows/${author.id}/followers`);
  assert.deepEqual(followers.body.followers.map(({ id }) => id), [actor.id]);

  const feed = await apiRequest(api.baseUrl, "/api/activity/feed?limit=10", {
    token: author.token,
  });
  assert.equal(feed.response.status, 200, JSON.stringify(feed.body));
  assert.ok(feed.body.activities.some(({ activity_type: type }) => type === "follow"));
  assert.ok(feed.body.activities.some(({ activity_type: type }) => type === "reaction"));

  const privateActivity = await apiRequest(
    api.baseUrl,
    `/api/activity/user/${actor.username}`,
    { token: author.token },
  );
  expectApiError(privateActivity, { status: 404, code: "ACTIVITY_NOT_FOUND" });
});

test("profile updates are restricted to the authenticated account and reject extra fields", async () => {
  const owner = await registerUser(api.baseUrl, "profile_owner");
  const other = await registerUser(api.baseUrl, "profile_other");

  const forbidden = await apiRequest(api.baseUrl, `/api/users/${owner.id}`, {
    method: "PUT",
    token: other.token,
    body: { bio: "Not yours" },
  });
  expectApiError(forbidden, { status: 403, code: "PROFILE_FORBIDDEN" });

  const massAssignment = await apiRequest(api.baseUrl, `/api/users/${owner.id}`, {
    method: "PUT",
    token: owner.token,
    body: { bio: "Safe bio", username: "hijacked" },
  });
  assert.equal(massAssignment.response.status, 400, JSON.stringify(massAssignment.body));
  assert.equal(massAssignment.body.success, false);

  const updated = await apiRequest(api.baseUrl, `/api/users/${owner.id}`, {
    method: "PUT",
    token: owner.token,
    body: { bio: "  <strong>Editorial writer</strong>  " },
  });
  assert.equal(updated.response.status, 200, JSON.stringify(updated.body));
  assert.equal(updated.body.bio, "Editorial writer");
});

test("full-text search handles title, content, filters, punctuation, and unpublished exclusion", async () => {
  const author = await registerUser(api.baseUrl, "search_author");
  await createPost(api.baseUrl, author.token, {
    title: "Orchid field guide",
    desc: "<p>A general botany article.</p>",
    cat: "science",
    tags: ["flowers"],
  });
  await createPost(api.baseUrl, author.token, {
    title: "Garden notes",
    desc: "<p>Rare orchid cultivation details.</p>",
    cat: "technology",
    tags: ["orchid"],
  });
  await createPost(api.baseUrl, author.token, {
    title: "Secret orchid draft",
    desc: "<p>This must never be searchable.</p>",
    draft: true,
  });

  const titleSearch = await apiRequest(api.baseUrl, "/api/posts?search=orchid");
  assert.equal(titleSearch.response.status, 200, JSON.stringify(titleSearch.body));
  assert.equal(titleSearch.body.pagination.total, 2);
  assert.equal(titleSearch.body.posts[0].title, "Orchid field guide");
  assert.equal(titleSearch.body.posts.some(({ title }) => title.includes("Secret")), false);

  const filtered = await apiRequest(
    api.baseUrl,
    "/api/posts?search=orchid&cat=technology&tag=orchid",
  );
  assert.equal(filtered.body.pagination.total, 1);
  assert.equal(filtered.body.posts[0].title, "Garden notes");

  const noResults = await apiRequest(api.baseUrl, "/api/posts?search=unfindablephrase");
  assert.equal(noResults.body.pagination.total, 0);
  assert.deepEqual(noResults.body.posts, []);

  const punctuation = await apiRequest(api.baseUrl, "/api/posts?search=%21%40%23%28%29");
  assert.equal(punctuation.response.status, 200, JSON.stringify(punctuation.body));
});

test("list endpoints validate pagination and use deterministic page boundaries", async () => {
  const author = await registerUser(api.baseUrl, "pagination_author");
  const tiedDate = "2026-01-15T12:00:00.000Z";
  await db.query(
    `
      INSERT INTO posts(title, "desc", cat, date, uid, draft, tags)
      SELECT
        'Story ' || value,
        '<p>Paginated content ' || value || '</p>',
        'technology',
        $1,
        $2,
        false,
        '[]'::jsonb
      FROM generate_series(1, 12) AS value
    `,
    [tiedDate, author.id],
  );

  const defaults = await apiRequest(api.baseUrl, "/api/posts");
  assert.equal(defaults.body.posts.length, 10);
  assert.equal(defaults.body.pagination.page, 1);
  assert.equal(defaults.body.pagination.total, 12);

  const firstPage = await apiRequest(api.baseUrl, "/api/posts?page=1&limit=5");
  const secondPage = await apiRequest(api.baseUrl, "/api/posts?page=2&limit=5");
  const firstIds = firstPage.body.posts.map(({ id }) => id);
  const secondIds = secondPage.body.posts.map(({ id }) => id);
  assert.equal(new Set([...firstIds, ...secondIds]).size, 10);
  assert.ok(firstIds.every((id, index) => index === 0 || firstIds[index - 1] > id));
  assert.equal(secondPage.body.pagination.hasNext, true);
  assert.equal(secondPage.body.pagination.hasPrevious, true);

  const finalPage = await apiRequest(api.baseUrl, "/api/posts?page=3&limit=5");
  assert.equal(finalPage.body.posts.length, 2);
  assert.equal(finalPage.body.pagination.hasNext, false);

  const beyond = await apiRequest(api.baseUrl, "/api/posts?page=9&limit=5");
  assert.deepEqual(beyond.body.posts, []);

  for (const query of ["page=0", "limit=0", "limit=101", "page=nope"]) {
    const invalid = await apiRequest(api.baseUrl, `/api/posts?${query}`);
    assert.equal(invalid.response.status, 400, JSON.stringify(invalid.body));
    assert.equal(invalid.body.success, false);
  }
});

test("validation and parsing failures use safe centralized API errors", async () => {
  const invalidJson = await apiRequest(api.baseUrl, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    rawBody: "{ invalid json",
  });
  expectApiError(invalidJson, { status: 400, code: "JSON_INVALID" });

  const wrongContentType = await apiRequest(api.baseUrl, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    rawBody: "username=test",
  });
  expectApiError(wrongContentType, { status: 415, code: "CONTENT_TYPE_UNSUPPORTED" });

  const malformedRegistration = await apiRequest(api.baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      username: "x",
      email: "not-an-email",
      password: "short",
      admin: true,
    },
  });
  assert.equal(malformedRegistration.response.status, 400, JSON.stringify(malformedRegistration.body));
  assert.equal(malformedRegistration.body.success, false);
  assert.equal("stack" in malformedRegistration.body, false);

  const missingRoute = await apiRequest(api.baseUrl, "/api/does-not-exist");
  expectApiError(missingRoute, { status: 404, code: "ROUTE_NOT_FOUND" });
});

test("the sample seed script loads a complete, internally consistent website dataset", async () => {
  const seedSql = await readFile(new URL("../../seed_sample.sql", import.meta.url), "utf8");
  await db.query(seedSql);

  const result = await db.query(`
    SELECT
      (SELECT COUNT(*)::integer FROM users) AS users,
      (SELECT COUNT(*)::integer FROM posts WHERE draft = false) AS published_posts,
      (SELECT COUNT(*)::integer FROM posts WHERE draft = true AND scheduled_publish_date IS NULL) AS drafts,
      (SELECT COUNT(*)::integer FROM posts WHERE draft = true AND scheduled_publish_date IS NOT NULL) AS scheduled_posts,
      (SELECT COUNT(*)::integer FROM comments) AS comments,
      (SELECT COUNT(*)::integer FROM bookmarks) AS bookmarks,
      (SELECT COUNT(*)::integer FROM reactions) AS reactions,
      (SELECT COUNT(*)::integer FROM follows) AS follows,
      (SELECT COUNT(*)::integer FROM activities) AS activities,
      (SELECT COUNT(*)::integer FROM subscribers) AS subscribers,
      (SELECT COUNT(*)::integer FROM posts WHERE search_vector IS NULL) AS missing_search_vectors
  `);

  assert.deepEqual(result.rows[0], {
    users: 8,
    published_posts: 24,
    drafts: 3,
    scheduled_posts: 3,
    comments: 24,
    bookmarks: 18,
    reactions: 25,
    follows: 17,
    activities: 90,
    subscribers: 3,
    missing_search_vectors: 0,
  });
});
