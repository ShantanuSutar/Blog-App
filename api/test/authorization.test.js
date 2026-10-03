import test from "node:test";
import assert from "node:assert/strict";

import { getUserActivities } from "../controllers/activity.js";
import {
  addBookmark,
  getBookmarkCount,
  getBookmarks,
  removeBookmark,
} from "../controllers/bookmarks.js";
import { addComment } from "../controllers/comment.js";
import { getFollowers, toggleFollow } from "../controllers/follows.js";
import {
  addPost,
  deletePost,
  getPostForEditing,
  getUserDrafts,
  getUserScheduledPosts,
  updatePost,
} from "../controllers/post.js";
import {
  addReaction,
  getReactions,
  getUserReaction,
  removeReaction,
} from "../controllers/reactions.js";
import { getProfile, updateProfile } from "../controllers/user.js";
import { db } from "../db.js";
import { ApiError } from "../errors/ApiError.js";
import { publishDuePosts } from "../scheduler.js";
import { commentBody, postCreateBody } from "../validation/requests.js";

const ownerId = 11;
const otherUserId = 22;
const resourceId = 41;

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

const createClient = (handler) => ({
  released: false,
  async query(query, values) {
    const command = String(query).trim();
    if (["BEGIN", "COMMIT", "ROLLBACK"].includes(command)) {
      return { rows: [], rowCount: 0 };
    }
    return handler(command, values);
  },
  release() {
    this.released = true;
  },
});

const expectApiError = async (promise, statusCode, code) => {
  await assert.rejects(promise, (error) => {
    assert.equal(error instanceof ApiError, true);
    assert.equal(error.statusCode, statusCode);
    assert.equal(error.code, code);
    return true;
  });
};

test("post creation always assigns ownership from the authenticated user", async (t) => {
  let insertedValues;
  const client = createClient(async (query, values) => {
    assert.match(query, /INSERT INTO posts/);
    insertedValues = values;
    return { rows: [{ id: resourceId }], rowCount: 1 };
  });
  t.mock.method(db, "connect", async () => client);

  const res = createResponse();
  await addPost({
    user: { id: otherUserId },
    body: {
      title: "Private working draft",
      desc: "",
      img: "",
      cat: "",
      draft: true,
      scheduled_publish_date: null,
      tags: [],
      featured: false,
      uid: ownerId,
      author_id: ownerId,
    },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(insertedValues[5], otherUserId);
  assert.notEqual(insertedValues[5], ownerId);
  assert.equal(client.released, true);
});

test("post creation schemas reject client-supplied ownership fields", () => {
  assert.throws(
    () => postCreateBody({ title: "Draft", draft: true, uid: ownerId }),
    (error) => error instanceof ApiError && error.code === "UNSUPPORTED_FIELDS",
  );
  assert.throws(
    () => commentBody({ comment: "Hello", cuserid: ownerId }),
    (error) => error instanceof ApiError && error.code === "UNSUPPORTED_FIELDS",
  );
});

test("User B cannot read User A's post through the owner edit endpoint", async (t) => {
  let queryValues;
  t.mock.method(db, "query", async (query, values) => {
    queryValues = values;
    return { rows: [], rowCount: 0 };
  });

  await expectApiError(
    getPostForEditing(
      { params: { id: String(resourceId) }, user: { id: otherUserId } },
      createResponse(),
    ),
    404,
    "POST_NOT_FOUND",
  );
  assert.deepEqual(queryValues, [resourceId, otherUserId]);
});

test("User B cannot update User A's post, draft, or scheduled post", async (t) => {
  let ownershipQueryValues;
  let updateWasAttempted = false;
  const client = createClient(async (query, values) => {
    if (/FOR UPDATE/.test(query)) {
      ownershipQueryValues = values;
      return { rows: [], rowCount: 0 };
    }
    if (/^UPDATE posts/.test(query)) updateWasAttempted = true;
    return { rows: [], rowCount: 0 };
  });
  t.mock.method(db, "connect", async () => client);

  await expectApiError(
    updatePost(
      {
        params: { id: String(resourceId) },
        user: { id: otherUserId },
        body: { title: "Hijacked title", draft: false },
      },
      createResponse(),
    ),
    404,
    "POST_NOT_FOUND",
  );
  assert.deepEqual(ownershipQueryValues, [resourceId, otherUserId]);
  assert.equal(updateWasAttempted, false);
});

test("User B cannot delete User A's post", async (t) => {
  let deleteValues;
  t.mock.method(db, "query", async (query, values) => {
    deleteValues = values;
    return { rows: [], rowCount: 0 };
  });

  await expectApiError(
    deletePost(
      { params: { id: String(resourceId) }, user: { id: otherUserId } },
      createResponse(),
    ),
    404,
    "POST_NOT_FOUND",
  );
  assert.deepEqual(deleteValues, [resourceId, otherUserId]);
});

test("draft and scheduled-post listings are scoped to the authenticated user", async (t) => {
  const calls = [];
  t.mock.method(db, "query", async (query, values) => {
    calls.push({ query, values });
    if (/COUNT\(\*\)/.test(query)) return { rows: [{ count: "0" }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  });

  await getUserDrafts({ query: {}, user: { id: otherUserId } }, createResponse());
  await getUserScheduledPosts({ query: {}, user: { id: otherUserId } }, createResponse());

  assert.equal(calls.length, 4);
  assert.deepEqual(calls[0].values, [otherUserId, 20, 0]);
  assert.deepEqual(calls[1].values, [otherUserId]);
  assert.deepEqual(calls[2].values, [otherUserId, 20, 0]);
  assert.deepEqual(calls[3].values, [otherUserId]);
  assert.match(calls[0].query, /uid = \$1 AND draft = true/);
  assert.match(calls[2].query, /uid = \$1 AND draft = true/);
});

test("comment creation cannot impersonate another user", async (t) => {
  let commentValues;
  let activityValues;
  const client = createClient(async (query, values) => {
    if (/INSERT INTO comments/.test(query)) {
      commentValues = values;
      return { rows: [{ id: 91, post_owner_id: ownerId }], rowCount: 1 };
    }
    if (/INSERT INTO activities/.test(query)) {
      activityValues = values;
      return { rows: [{ id: 92 }], rowCount: 1 };
    }
    throw new Error(`Unexpected query: ${query}`);
  });
  t.mock.method(db, "connect", async () => client);

  const res = createResponse();
  await addComment({
    params: { id: String(resourceId) },
    user: { id: otherUserId },
    body: { comment: "Authenticated comment", cuserid: ownerId },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.deepEqual(commentValues, ["Authenticated comment", otherUserId, resourceId]);
  assert.equal(activityValues[0], otherUserId);
});

test("profile updates use the authenticated identity, never the requested body owner", async (t) => {
  let updateValues;
  t.mock.method(db, "query", async (query, values) => {
    updateValues = values;
    return { rows: [{ id: otherUserId, username: "other", bio: values[0] }], rowCount: 1 };
  });

  await updateProfile({
    params: { id: String(ownerId) },
    user: { id: otherUserId },
    body: { bio: "My own profile", user_id: ownerId },
  }, createResponse());

  assert.deepEqual(updateValues, ["My own profile", otherUserId]);
});

test("bookmark reads and deletes are scoped to the authenticated user", async (t) => {
  const calls = [];
  t.mock.method(db, "query", async (query, values) => {
    calls.push({ query, values });
    if (/COUNT\(b\.id\)/.test(query)) return { rows: [{ count: "0" }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  });

  await getBookmarks({ query: {}, user: { id: otherUserId } }, createResponse());
  await removeBookmark(
    { params: { postId: String(resourceId) }, user: { id: otherUserId } },
    createResponse(),
  );

  assert.deepEqual(calls[0].values, [otherUserId, 20, 0]);
  assert.deepEqual(calls[1].values, [otherUserId]);
  assert.deepEqual(calls[2].values, [otherUserId, resourceId]);
});

test("bookmark creation resolves visibility and insertion in one database round trip", async (t) => {
  const calls = [];
  t.mock.method(db, "query", async (query, values) => {
    calls.push({ query, values });
    return { rows: [{ post_exists: true, inserted: false }], rowCount: 1 };
  });

  const res = createResponse();
  await addBookmark({
    body: { postId: resourceId },
    user: { id: otherUserId },
  }, res);

  assert.equal(calls.length, 1);
  assert.match(calls[0].query, /WITH target AS MATERIALIZED/);
  assert.deepEqual(calls[0].values, [otherUserId, resourceId]);
  assert.deepEqual(res.body, { message: "Already bookmarked", bookmarked: true });
});

test("public bookmark counts do not expose draft or future-scheduled posts", async (t) => {
  let countQuery;
  t.mock.method(db, "query", async (query) => {
    countQuery = query;
    return { rows: [{ count: "0" }], rowCount: 1 };
  });

  const res = createResponse();
  await getBookmarkCount({ params: { postId: String(resourceId) } }, res);

  assert.equal(res.body.count, 0);
  assert.match(countQuery, /p\.draft = false/);
  assert.match(countQuery, /scheduled_publish_date/);
});

test("User B cannot remove User A's reaction", async (t) => {
  let deleteValues;
  t.mock.method(db, "query", async (query, values) => {
    deleteValues = values;
    return { rows: [], rowCount: 0 };
  });

  await expectApiError(
    removeReaction(
      { params: { reactionId: "73" }, user: { id: otherUserId } },
      createResponse(),
    ),
    404,
    "REACTION_NOT_FOUND",
  );
  assert.deepEqual(deleteValues, [73, otherUserId]);
});

test("reaction creation always associates the authenticated user", async (t) => {
  let insertValues;
  const client = createClient(async (query, values) => {
    if (/SELECT uid AS target_user_id/.test(query)) {
      return { rows: [{ target_user_id: ownerId }], rowCount: 1 };
    }
    if (/SELECT id, reaction_type FROM reactions/.test(query)) {
      return { rows: [], rowCount: 0 };
    }
    if (/INSERT INTO reactions/.test(query)) {
      insertValues = values;
      return { rows: [{ id: 74 }], rowCount: 1 };
    }
    if (/INSERT INTO activities/.test(query)) {
      return { rows: [{ id: 75 }], rowCount: 1 };
    }
    throw new Error(`Unexpected query: ${query}`);
  });
  t.mock.method(db, "connect", async () => client);

  await addReaction({
    user: { id: otherUserId },
    body: { postId: resourceId, reactionType: "like", user_id: ownerId },
  }, createResponse());

  assert.deepEqual(insertValues, [otherUserId, resourceId, null, "like"]);
});

test("reaction reads do not expose activity on draft or future-scheduled posts", async (t) => {
  const calls = [];
  t.mock.method(db, "query", async (query, values) => {
    calls.push({ query, values });
    return { rows: [], rowCount: 0 };
  });

  await getReactions(
    { params: { postId: String(resourceId) }, query: {} },
    createResponse(),
  );
  await getUserReaction(
    {
      params: { commentId: String(resourceId) },
      user: { id: otherUserId },
    },
    createResponse(),
  );

  assert.match(calls[0].query, /JOIN posts p/);
  assert.match(calls[0].query, /p\.draft = false/);
  assert.deepEqual(calls[0].values, [resourceId, 20, 0]);
  assert.match(calls[1].query, /GROUP BY r\.reaction_type/);
  assert.deepEqual(calls[1].values, [resourceId]);
  assert.match(calls[2].query, /JOIN comments c/);
  assert.match(calls[2].query, /JOIN posts p/);
  assert.match(calls[2].query, /p\.draft = false/);
  assert.deepEqual(calls[2].values, [otherUserId, resourceId]);
});

test("follow mutations always use the authenticated user as follower", async (t) => {
  let insertValues;
  const client = createClient(async (query, values) => {
    if (/SELECT 1 FROM users/.test(query)) return { rows: [{ id: ownerId }], rowCount: 1 };
    if (/DELETE FROM follows/.test(query)) return { rows: [], rowCount: 0 };
    if (/INSERT INTO follows/.test(query)) {
      insertValues = values;
      return { rows: [{ id: 81 }], rowCount: 1 };
    }
    if (/INSERT INTO activities/.test(query)) return { rows: [{ id: 82 }], rowCount: 1 };
    throw new Error(`Unexpected query: ${query}`);
  });
  t.mock.method(db, "connect", async () => client);

  await toggleFollow({
    params: { userId: String(ownerId) },
    user: { id: otherUserId },
    body: { follower_id: ownerId },
  }, createResponse());

  assert.deepEqual(insertValues, [otherUserId, ownerId]);
});

test("follow lists distinguish missing users from empty lists in one query", async (t) => {
  let queryCount = 0;
  t.mock.method(db, "query", async (query, values) => {
    queryCount += 1;
    assert.match(query, /relationship_page/);
    assert.deepEqual(values, [ownerId, 20, 0]);
    return {
      rows: [{
        owner_username: "owner",
        id: null,
        username: null,
        avatar: null,
        bio: null,
        created_at: null,
        total_count: 0,
      }],
      rowCount: 1,
    };
  });

  const res = createResponse();
  await getFollowers({ params: { userId: String(ownerId) }, query: {} }, res);

  assert.equal(queryCount, 1);
  assert.deepEqual(res.body, {
    userId: ownerId,
    username: "owner",
    followers: [],
    count: 0,
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false,
    },
  });
});

test("profile summary and recent posts are loaded in one database query", async (t) => {
  let queryCount = 0;
  t.mock.method(db, "query", async (query, values) => {
    queryCount += 1;
    assert.match(query, /AS posts_count/);
    assert.match(query, /LEFT JOIN LATERAL/);
    assert.deepEqual(values, ["owner", otherUserId]);
    return {
      rows: [{
        id: ownerId,
        username: "owner",
        avatar: null,
        bio: "Writer",
        created_at: new Date("2026-01-01T00:00:00.000Z"),
        posts_count: 3,
        follower_count: 2,
        following_count: 1,
        is_following: true,
        recent_post_id: resourceId,
        recent_post_title: "Post",
        recent_post_img: "",
        recent_post_views: 2,
        recent_post_date: new Date("2026-01-02T00:00:00.000Z"),
      }],
      rowCount: 1,
    };
  });

  const res = createResponse();
  await getProfile({
    params: { username: "owner" },
    user: { id: otherUserId },
  }, res);

  assert.equal(queryCount, 1);
  assert.equal(res.body.postsCount, 3);
  assert.equal(res.body.isFollowing, true);
  assert.deepEqual(res.body.recentPosts, [{
    id: resourceId,
    title: "Post",
    img: "",
    views: 2,
    date: new Date("2026-01-02T00:00:00.000Z"),
  }]);
});

test("self-follow attempts are rejected", async () => {
  await expectApiError(
    toggleFollow(
      { params: { userId: String(otherUserId) }, user: { id: otherUserId } },
      createResponse(),
    ),
    403,
    "SELF_FOLLOW_FORBIDDEN",
  );
});

test("User B cannot retrieve User A's private user activity endpoint", async (t) => {
  let queryCount = 0;
  t.mock.method(db, "query", async () => {
    queryCount += 1;
    return { rows: [{ id: ownerId }], rowCount: 1 };
  });

  await expectApiError(
    getUserActivities(
      {
        params: { username: "owner" },
        query: { filter: "all" },
        user: { id: otherUserId, username: "other" },
      },
      createResponse(),
    ),
    404,
    "ACTIVITY_NOT_FOUND",
  );
  assert.equal(queryCount, 0);
});

test("scheduler attributes publication activity to the post owner from the database", async (t) => {
  let publicationQuery;
  const client = createClient(async (query, values) => {
    if (/UPDATE posts/.test(query)) {
      publicationQuery = query;
      return { rows: [{ id: resourceId, title: "Scheduled", uid: ownerId }], rowCount: 1 };
    }
    throw new Error(`Unexpected query: ${query}`);
  });
  t.mock.method(db, "connect", async () => client);
  t.mock.method(db, "query", async (query) => {
    assert.match(query, /SELECT email FROM subscribers/);
    return { rows: [], rowCount: 0 };
  });

  await publishDuePosts();

  assert.match(publicationQuery, /INSERT INTO activities/);
  assert.match(publicationQuery, /SELECT uid, 'post', id FROM published/);
});
