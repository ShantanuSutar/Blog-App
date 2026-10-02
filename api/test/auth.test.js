import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { login, logout, register } from "../controllers/auth.js";
import { db } from "../db.js";
import { ApiError } from "../errors/ApiError.js";
import {
  accessTokenExpiration,
  assertAuthConfiguration,
  bcryptCost,
} from "../security/auth.js";

const jwtSecret = "test-secret-that-is-long-enough";

const createResponse = () => ({
  statusCode: 200,
  body: null,
  headers: {},
  set(name, value) {
    this.headers[name.toLowerCase()] = value;
    return this;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const expectInvalidCredentials = async (promise) => {
  await assert.rejects(promise, (error) => {
    assert.equal(error instanceof ApiError, true);
    assert.equal(error.statusCode, 401);
    assert.equal(error.code, "AUTH_INVALID_CREDENTIALS");
    assert.equal(error.message, "Wrong username or password");
    return true;
  });
};

test("registration stores a bcrypt hash at the configured cost", async (t) => {
  process.env.BCRYPT_ROUNDS = "12";
  let insertedValues;
  let queryCount = 0;
  t.mock.method(db, "query", async (query, values) => {
    queryCount += 1;
    if (queryCount === 1) return { rows: [] };
    insertedValues = values;
    return { rows: [], rowCount: 1 };
  });
  const res = createResponse();

  await register({
    body: {
      username: "secure_writer",
      email: "writer@example.com",
      password: "correct horse battery staple",
    },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(insertedValues[0], "secure_writer");
  assert.equal(insertedValues[1], "writer@example.com");
  assert.notEqual(insertedValues[2], "correct horse battery staple");
  assert.equal(bcrypt.getRounds(insertedValues[2]), 12);
  assert.equal(await bcrypt.compare("correct horse battery staple", insertedValues[2]), true);
  assert.equal(JSON.stringify(res.body).includes(insertedValues[2]), false);
});

test("valid login returns a minimal user and an expiring HS256 token", async (t) => {
  process.env.JWT_SECRET = jwtSecret;
  process.env.JWT_EXPIRES_IN = "1h";
  const passwordHash = await bcrypt.hash("valid password", 10);
  t.mock.method(db, "query", async () => ({
    rows: [{
      id: 7,
      username: "writer",
      email: "private@example.com",
      password: passwordHash,
      avatar: null,
      bio: "Writes about security.",
      created_at: "2026-01-01T00:00:00.000Z",
    }],
  }));
  const res = createResponse();

  await login({ body: { username: "writer", password: "valid password" } }, res);

  const decoded = jwt.decode(res.body.token, { complete: true });
  assert.equal(res.statusCode, 200);
  assert.equal(decoded.header.alg, "HS256");
  assert.deepEqual(Object.keys(decoded.payload).sort(), ["exp", "iat", "id"]);
  assert.equal(decoded.payload.id, 7);
  assert.ok(decoded.payload.exp > decoded.payload.iat);
  assert.equal("password" in res.body.other, false);
  assert.equal("email" in res.body.other, false);
  assert.equal(res.headers["cache-control"], "no-store");
  assert.equal(res.headers.pragma, "no-cache");
});

test("invalid password and nonexistent account return the same credential error", async (t) => {
  process.env.JWT_SECRET = jwtSecret;
  const passwordHash = await bcrypt.hash("valid password", 10);
  const responses = [
    { rows: [{ id: 7, username: "writer", password: passwordHash }] },
    { rows: [] },
  ];
  t.mock.method(db, "query", async () => responses.shift());

  await expectInvalidCredentials(login({ body: { username: "writer", password: "wrong" } }, createResponse()));
  await expectInvalidCredentials(login({ body: { username: "missing", password: "wrong" } }, createResponse()));
});

test("logout response makes stateless token cleanup non-cacheable", () => {
  const res = createResponse();

  // Logout does not revoke a stateless token; the frontend removes it locally.
  logout({}, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["cache-control"], "no-store");
});

test("authentication configuration rejects unsafe production values", () => {
  const original = {
    nodeEnv: process.env.NODE_ENV,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN,
    bcryptRounds: process.env.BCRYPT_ROUNDS,
  };

  try {
    process.env.NODE_ENV = "production";
    delete process.env.JWT_SECRET;
    process.env.JWT_EXPIRES_IN = "1h";
    process.env.BCRYPT_ROUNDS = "12";
    assert.throws(() => assertAuthConfiguration(), /must be configured/);

    process.env.JWT_SECRET = "short-secret";
    assert.throws(() => assertAuthConfiguration(), /at least 32 bytes/);

    process.env.JWT_SECRET = "a-secure-test-secret-that-is-longer-than-32-bytes";
    process.env.JWT_EXPIRES_IN = "30d";
    assert.throws(() => accessTokenExpiration(), /between 1 second and 7 days/);

    process.env.JWT_EXPIRES_IN = "1h";
    process.env.BCRYPT_ROUNDS = "8";
    assert.throws(() => bcryptCost(), /between 10 and 14/);
  } finally {
    if (original.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = original.nodeEnv;
    if (original.jwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = original.jwtSecret;
    if (original.jwtExpiresIn === undefined) delete process.env.JWT_EXPIRES_IN;
    else process.env.JWT_EXPIRES_IN = original.jwtExpiresIn;
    if (original.bcryptRounds === undefined) delete process.env.BCRYPT_ROUNDS;
    else process.env.BCRYPT_ROUNDS = original.bcryptRounds;
  }
});
