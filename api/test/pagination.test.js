import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { getBookmarks } from "../controllers/bookmarks.js";
import { getComment } from "../controllers/comment.js";
import { getFollowers } from "../controllers/follows.js";
import { getReactions } from "../controllers/reactions.js";
import { db } from "../db.js";
import { createPaginationMetadata, getPagination } from "../utils/request.js";

const migrationUrl = new URL("../migrations/006_comment_pagination_index.sql", import.meta.url);

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

test("pagination defaults, caps, and metadata handle empty and final pages", () => {
  assert.deepEqual(getPagination(), { page: 1, limit: 20, offset: 0 });
  assert.deepEqual(getPagination({ page: "3", limit: "500" }), {
    page: 3,
    limit: 100,
    offset: 200,
  });
  assert.deepEqual(createPaginationMetadata({ page: 3, limit: 10, total: 25 }), {
    page: 3,
    limit: 10,
    total: 25,
    totalPages: 3,
    hasNext: false,
    hasPrevious: true,
  });
  assert.deepEqual(createPaginationMetadata({ page: 1, limit: 20, total: 0 }), {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  });
});

test("comments are bounded and deterministically ordered", async (t) => {
  const calls = [];
  t.mock.method(db, "query", async (query, values) => {
    calls.push({ query, values });
    if (/COUNT\(c\.id\)/.test(query)) return { rows: [{ count: "21" }] };
    return { rows: [{ id: 7, comment: "Newest" }] };
  });

  const res = createResponse();
  await getComment({ params: { id: "9" }, query: { page: 2, limit: 10 } }, res);

  assert.match(calls[0].query, /ORDER BY c\.created_at DESC, c\.id DESC/);
  assert.match(calls[0].query, /LIMIT \$2 OFFSET \$3/);
  assert.deepEqual(calls[0].values, [9, 10, 10]);
  assert.deepEqual(calls[1].values, [9]);
  assert.deepEqual(res.body.pagination, {
    page: 2,
    limit: 10,
    total: 21,
    totalPages: 3,
    hasNext: true,
    hasPrevious: true,
  });
});

test("bookmarks paginate only the authenticated user's visible posts", async (t) => {
  const calls = [];
  t.mock.method(db, "query", async (query, values) => {
    calls.push({ query, values });
    if (/COUNT\(b\.id\)/.test(query)) return { rows: [{ count: "1" }] };
    return { rows: [{ id: 31, title: "Saved" }] };
  });

  const res = createResponse();
  await getBookmarks({ query: { page: 1, limit: 5 }, user: { id: 4 } }, res);

  assert.match(calls[0].query, /b\.uid = \$1/);
  assert.match(calls[0].query, /ORDER BY b\.created_at DESC, b\.id DESC/);
  assert.deepEqual(calls[0].values, [4, 5, 0]);
  assert.equal(res.body.bookmarks.length, 1);
  assert.equal(res.body.pagination.total, 1);
});

test("follow lists preserve total metadata on a page beyond available data", async (t) => {
  t.mock.method(db, "query", async (query, values) => {
    assert.match(query, /relationship_count/);
    assert.match(query, /ORDER BY f\.created_at DESC, f\.id DESC/);
    assert.deepEqual(values, [8, 20, 40]);
    return {
      rows: [{
        owner_username: "writer",
        id: null,
        username: null,
        avatar: null,
        bio: null,
        created_at: null,
        total_count: 22,
      }],
    };
  });

  const res = createResponse();
  await getFollowers({ params: { userId: "8" }, query: { page: 3, limit: 20 } }, res);

  assert.deepEqual(res.body.followers, []);
  assert.equal(res.body.count, 22);
  assert.deepEqual(res.body.pagination, {
    page: 3,
    limit: 20,
    total: 22,
    totalPages: 2,
    hasNext: false,
    hasPrevious: true,
  });
});

test("reaction counts remain complete while reacting users are bounded", async (t) => {
  const calls = [];
  t.mock.method(db, "query", async (query, values) => {
    calls.push({ query, values });
    if (/GROUP BY r\.reaction_type/.test(query)) {
      return { rows: [{ reaction_type: "like", count: 31 }] };
    }
    return { rows: [{ reaction_type: "like", user_id: 3, username: "reader", user_img: null }] };
  });

  const res = createResponse();
  await getReactions({
    params: { postId: "9" },
    query: { page: 2, limit: 10 },
  }, res);

  assert.deepEqual(calls[0].values, [9, 10, 10]);
  assert.match(calls[0].query, /LIMIT \$2 OFFSET \$3/);
  assert.equal(res.body.total, 31);
  assert.equal(res.body.grouped.like.count, 31);
  assert.equal(res.body.grouped.like.users.length, 1);
  assert.equal(res.body.pagination.hasNext, true);
});

test("comment pagination migration matches the list filter and ordering", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  assert.match(migration, /ON comments \(cpostid, created_at DESC, id DESC\)/);
});
