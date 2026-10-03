import assert from "node:assert/strict";

import { db } from "../../db.js";
import app from "../../index.js";

const schemaPattern = /^unsaid_test_[a-z0-9_]+$/;

export const assertIsolatedTestDatabase = async () => {
  const expectedSchema = process.env.TEST_DATABASE_SCHEMA;
  if (!expectedSchema || !schemaPattern.test(expectedSchema)) {
    throw new Error("Integration tests require the isolated npm test harness");
  }

  const result = await db.query("SELECT current_schema() AS schema, current_database() AS database");
  assert.equal(result.rows[0].schema, expectedSchema, "Refusing to clean a non-test schema");
  return result.rows[0];
};

export const resetDatabase = async () => {
  await assertIsolatedTestDatabase();
  await db.query(`
    TRUNCATE TABLE
      activities,
      reactions,
      bookmarks,
      comments,
      follows,
      posts,
      subscribers,
      users
    RESTART IDENTITY CASCADE
  `);
};

export const startApiServer = async () => {
  const server = await new Promise((resolve, reject) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
    instance.once("error", reject);
  });
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
};

export const apiRequest = async (baseUrl, path, {
  method = "GET",
  token,
  body,
  headers = {},
  rawBody,
} = {}) => {
  const requestHeaders = { ...headers };
  if (token) requestHeaders.Authorization = `Bearer ${token}`;
  if (body !== undefined) requestHeaders["Content-Type"] = "application/json";

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: requestHeaders,
    body: rawBody !== undefined ? rawBody : body === undefined ? undefined : JSON.stringify(body),
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  return { response, body: payload };
};

export const registerUser = async (baseUrl, suffix) => {
  const username = `writer_${suffix}`;
  const email = `${username}@example.test`;
  const password = "correct horse battery staple";
  const registration = await apiRequest(baseUrl, "/api/auth/register", {
    method: "POST",
    body: { username, email, password },
  });
  assert.equal(registration.response.status, 201, JSON.stringify(registration.body));

  const login = await apiRequest(baseUrl, "/api/auth/login", {
    method: "POST",
    body: { username, password },
  });
  assert.equal(login.response.status, 200, JSON.stringify(login.body));
  return {
    id: login.body.other.id,
    username,
    email,
    password,
    token: login.body.token,
  };
};

export const createPost = async (baseUrl, token, overrides = {}) => {
  const result = await apiRequest(baseUrl, "/api/posts", {
    method: "POST",
    token,
    body: {
      title: "A test story",
      desc: "<p>A thoughtful integration test story.</p>",
      cat: "technology",
      tags: ["testing"],
      draft: false,
      ...overrides,
    },
  });
  assert.equal(result.response.status, 201, JSON.stringify(result.body));
  return result.body;
};

export const expectApiError = (result, { status, code }) => {
  assert.equal(result.response.status, status, JSON.stringify(result.body));
  assert.equal(result.body.success, false);
  assert.equal(result.body.code, code);
  assert.equal(typeof result.body.message, "string");
  assert.equal("stack" in result.body, false);
  assert.equal(JSON.stringify(result.body).toLowerCase().includes("select "), false);
};

export { db };
