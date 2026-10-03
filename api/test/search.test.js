import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { getPosts } from "../controllers/post.js";
import { db } from "../db.js";
import { buildPostFeedQueries } from "../services/postFeed.js";

const migrationUrl = new URL("../migrations/005_post_full_text_search.sql", import.meta.url);

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

test("search vectors weight title matches above body matches and strip rich-text markup", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  assert.match(migration, /to_tsvector\('english', COALESCE\(NEW\.title, ''\)\), 'A'/);
  assert.match(migration, /to_tsvector\('english', COALESCE\(NEW\.cat, ''\)\), 'B'/);
  assert.match(migration, /COALESCE\(NEW\.tags::text, ''\)\), 'B'/);
  assert.match(migration, /COALESCE\(NEW\."desc", ''\), '<\[\^>\]\*>', ' ', 'g'/);
  assert.match(migration, /'C'\s*\);/);
  assert.match(migration, /BEFORE INSERT OR UPDATE OF title, "desc", cat, tags/);
});

test("full-text search is parameterized, visibility-scoped, and relevance ordered", () => {
  const queries = buildPostFeedQueries({
    search: "database indexing",
    limit: 10,
    offset: 0,
  });

  assert.match(queries.rowsQuery, /websearch_to_tsquery\('english', \$1\)/);
  assert.match(queries.rowsQuery, /p\.search_vector @@ websearch_to_tsquery\('english', \$1\)/);
  assert.match(queries.rowsQuery, /ts_rank_cd/);
  assert.match(queries.rowsQuery, /matches\.username, matches\."userAvatar"/);
  assert.doesNotMatch(queries.rowsQuery, /SELECT matches\.\*/);
  assert.match(queries.rowsQuery, /ORDER BY search_rank DESC, date DESC, id DESC/);
  assert.match(queries.rowsQuery, /p\.draft = false/);
  assert.match(queries.rowsQuery, /scheduled_publish_date <= CURRENT_TIMESTAMP/);
  assert.doesNotMatch(queries.rowsQuery, /database indexing/);
  assert.deepEqual(queries.rowsParams, ["database indexing", "%database indexing%", 10, 0]);
});

test("category and tag filters combine with search and retain pagination", () => {
  const queries = buildPostFeedQueries({
    search: "postgres",
    cat: "scitech",
    tag: "Database",
    limit: 25,
    offset: 50,
  });

  assert.match(queries.rowsQuery, /p\.cat = \$1/);
  assert.match(queries.rowsQuery, /p\.tags::jsonb @> \$2::jsonb/);
  assert.match(queries.rowsQuery, /websearch_to_tsquery\('english', \$3\)/);
  assert.match(queries.rowsQuery, /LIMIT \$5 OFFSET \$6/);
  assert.deepEqual(queries.rowsParams, [
    "scitech",
    '["Database"]',
    "postgres",
    "%postgres%",
    25,
    50,
  ]);
  assert.deepEqual(queries.countParams, [
    "scitech",
    '["Database"]',
    "postgres",
    "%postgres%",
  ]);
});

test("punctuation and LIKE metacharacters stay in parameters and use safe fallback escaping", () => {
  const search = '100%_coverage - "quoted" !!!';
  const queries = buildPostFeedQueries({ search, limit: 10, offset: 0 });

  assert.equal(queries.rowsParams[0], search);
  assert.equal(queries.rowsParams[1], '%100!%!_coverage - "quoted" !!!!!!%');
  assert.doesNotMatch(queries.rowsQuery, /100%_coverage|quoted/);
  assert.match(queries.rowsQuery, /numnode\(websearch_to_tsquery\('english', \$1\)\) = 0/);
  assert.match(queries.rowsQuery, /ESCAPE '!'/);
});

test("search returns the existing empty paginated response when there are no matches", async (t) => {
  t.mock.method(db, "query", async (query) => String(query).includes("COUNT(*)")
    ? { rows: [{ count: "0" }], rowCount: 1 }
    : { rows: [], rowCount: 0 });

  const res = createResponse();
  await getPosts({ query: { search: "no matching story", page: 2, limit: 10 } }, res);

  assert.deepEqual(res.body, {
    posts: [],
    totalPages: 0,
    currentPage: 2,
    pagination: {
      page: 2,
      limit: 10,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false,
    },
  });
});

test("the migration creates a partial GIN index for published post vectors", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  assert.match(migration, /USING GIN \(search_vector\)/);
  assert.match(migration, /WHERE draft = FALSE/);
  assert.match(migration, /ALTER COLUMN search_vector SET NOT NULL/);
});
