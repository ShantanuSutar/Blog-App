import assert from "node:assert/strict";
import test from "node:test";

import cors from "cors";
import express from "express";

import { config } from "../config.js";
import { errorHandler } from "../middleware/error.js";
import {
  corsOptions,
  createRateLimiter,
  requireSupportedContentType,
  securityHeaders,
} from "../middleware/security.js";

const withServer = async (app, callback) => {
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

test("Helmet adds API-safe security headers without blocking cross-origin images", async () => {
  const app = express();
  app.disable("x-powered-by");
  app.use(securityHeaders);
  app.get("/image", (req, res) => res.type("png").send(Buffer.from("image")));

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/image`);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("cross-origin-resource-policy"), "cross-origin");
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    assert.equal(response.headers.get("content-security-policy"), null);
    assert.equal(response.headers.get("x-powered-by"), null);
  });
});

test("CORS allows configured development origins and rejects unknown browser origins", async () => {
  const app = express();
  app.use(cors(corsOptions));
  app.get("/resource", (req, res) => res.json({ ok: true }));
  app.use(errorHandler);

  await withServer(app, async (baseUrl) => {
    const allowedOrigin = config.allowedOrigins[0];
    const allowed = await fetch(`${baseUrl}/resource`, {
      headers: { Origin: allowedOrigin },
    });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.headers.get("access-control-allow-origin"), allowedOrigin);

    const denied = await fetch(`${baseUrl}/resource`, {
      headers: { Origin: "https://attacker.example" },
    });
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).code, "CORS_ORIGIN_DENIED");
  });
});

test("rate limits return the centralized 429 response and standard headers", async () => {
  const app = express();
  app.use(createRateLimiter({
    windowMs: 60_000,
    max: 2,
    identifier: "test",
  }));
  app.get("/limited", (req, res) => res.json({ ok: true }));
  app.use(errorHandler);

  await withServer(app, async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/limited`)).status, 200);
    assert.equal((await fetch(`${baseUrl}/limited`)).status, 200);
    const limited = await fetch(`${baseUrl}/limited`);
    const body = await limited.json();

    assert.equal(limited.status, 429);
    assert.equal(body.code, "RATE_LIMIT_EXCEEDED");
    assert.equal(body.success, false);
    assert.ok(limited.headers.get("retry-after"));
    assert.ok(limited.headers.get("ratelimit"));
  });
});

test("JSON content-type hardening preserves legitimate rich-text payloads", async () => {
  const app = express();
  app.use(requireSupportedContentType);
  app.use(express.json({ limit: config.security.jsonBodyLimit }));
  app.post("/posts", (req, res) => res.json({ length: req.body.desc.length }));
  app.use(errorHandler);

  await withServer(app, async (baseUrl) => {
    const richText = `<p>${"a".repeat(250_000)}</p>`;
    const valid = await fetch(`${baseUrl}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ desc: richText }),
    });
    assert.equal(valid.status, 200);
    assert.equal((await valid.json()).length, richText.length);

    const unsupported = await fetch(`${baseUrl}/posts`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "not json",
    });
    assert.equal(unsupported.status, 415);
    assert.equal((await unsupported.json()).code, "CONTENT_TYPE_UNSUPPORTED");
  });
});
