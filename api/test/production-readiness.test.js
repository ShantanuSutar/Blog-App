import assert from "node:assert/strict";
import test from "node:test";
import cron from "node-cron";

import app, { startServer } from "../index.js";
import { assertEnvironmentConfiguration } from "../config.js";
import { db } from "../db.js";
import { schedulePostPublisher, stopPostPublisher } from "../scheduler.js";
import { sanitizeLogValue } from "../utils/logger.js";

const withServer = async (callback) => {
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  const { port } = server.address();

  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
};

test("environment validation rejects incomplete production and SMTP configuration", () => {
  assert.throws(
    () => assertEnvironmentConfiguration({ NODE_ENV: "production" }),
    /Production database configuration is incomplete/,
  );
  assert.throws(
    () => assertEnvironmentConfiguration({ NODE_ENV: "staging" }),
    /NODE_ENV must be development, test, or production/,
  );
  assert.throws(
    () => assertEnvironmentConfiguration({ SMTP_USER: "mailer" }),
    /must be configured together/,
  );
  assert.throws(
    () => assertEnvironmentConfiguration({ DATABASE_URL: "https://example.com/db" }),
    /postgres or postgresql protocol/,
  );
  assert.doesNotThrow(() => assertEnvironmentConfiguration({
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://user:password@db.example/blog",
  }));
});

test("structured logging redacts secrets recursively", () => {
  const safe = sanitizeLogValue({
    password: "plain-text",
    authorization: "Bearer signed-token",
    nested: {
      message: "connection failed with password=database-secret",
      url: "postgresql://writer:database-secret@localhost/blog",
    },
  });
  const serialized = JSON.stringify(safe);

  assert.equal(serialized.includes("plain-text"), false);
  assert.equal(serialized.includes("signed-token"), false);
  assert.equal(serialized.includes("database-secret"), false);
  assert.match(serialized, /\[REDACTED\]/);
});

test("health endpoint is safe and request logs omit query strings", async (t) => {
  t.mock.method(db, "query", async () => ({ rows: [{ ok: 1 }], rowCount: 1 }));
  const originalConsoleLog = console.log;
  const logs = [];
  console.log = (...values) => logs.push(values);

  try {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/health?token=must-not-be-logged`);
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.status, "healthy");
      assert.ok(response.headers.get("x-request-id"));
    });
  } finally {
    console.log = originalConsoleLog;
  }

  const serializedLogs = JSON.stringify(logs);
  assert.match(serializedLogs, /HTTP request completed/);
  assert.match(serializedLogs, /"path":"\/health"/);
  assert.equal(serializedLogs.includes("must-not-be-logged"), false);
});

test("server startup fails before listening when PostgreSQL is unavailable", async (t) => {
  t.mock.method(db, "query", async () => {
    throw new Error("database unavailable");
  });

  await assert.rejects(startServer(), /database unavailable/);
});

test("scheduled publishing initializes once and releases its task", async (t) => {
  let scheduleCalls = 0;
  let stopCalls = 0;
  let destroyCalls = 0;
  const task = {
    stop() { stopCalls += 1; },
    destroy() { destroyCalls += 1; },
  };
  t.mock.method(cron, "schedule", () => {
    scheduleCalls += 1;
    return task;
  });

  assert.equal(schedulePostPublisher(), task);
  assert.equal(schedulePostPublisher(), task);
  assert.equal(scheduleCalls, 1);
  assert.equal(await stopPostPublisher(), true);
  assert.equal(stopCalls, 1);
  assert.equal(destroyCalls, 1);
  assert.equal(await stopPostPublisher(), false);
});
