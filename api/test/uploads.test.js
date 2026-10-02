import assert from "node:assert/strict";
import test from "node:test";

import express from "express";

import { config } from "../config.js";
import apiApp from "../index.js";
import { uploadImage } from "../controllers/upload.js";
import { errorHandler } from "../middleware/error.js";
import { createImageUpload } from "../middleware/imageUpload.js";
import uploadRoutes from "../routes/uploads.js";
import { mediaStorage } from "../services/mediaStorage.js";

const validPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const postImageUpload = createImageUpload({
  fieldName: "file",
  namespace: "posts",
  allowedTypeNames: ["jpeg", "png", "webp", "gif"],
});

const createUploadApp = () => {
  const app = express();
  app.post("/upload", postImageUpload, uploadImage);
  app.use(errorHandler);
  return app;
};

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

const imageForm = (contents, { filename = "image.png", mimeType = "image/png" } = {}) => {
  const form = new FormData();
  form.append("file", new Blob([contents], { type: mimeType }), filename);
  return form;
};

test("a valid image is signature-checked and stored under a safe unique name", async () => {
  const app = createUploadApp();
  let publicPath;

  try {
    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/upload`, {
        method: "POST",
        body: imageForm(validPng, { filename: "../../unsafe name.png" }),
      });
      publicPath = await response.json();

      assert.equal(response.status, 200, JSON.stringify(publicPath));
      assert.match(
        publicPath,
        /^\/api\/uploads\/posts\/[0-9a-f-]{36}\.png$/,
      );
      assert.equal(publicPath.includes("unsafe"), false);
      assert.equal(publicPath.includes(".."), false);
    });

    await withServer(apiApp, async (baseUrl) => {
      const storedImage = await fetch(`${baseUrl}${publicPath}`);
      assert.equal(storedImage.status, 200);
      assert.match(storedImage.headers.get("content-type"), /^image\/png/);
      assert.equal(storedImage.headers.get("x-content-type-options"), "nosniff");
      assert.match(storedImage.headers.get("cache-control"), /immutable/);
      assert.deepEqual(Buffer.from(await storedImage.arrayBuffer()), validPng);
    });
  } finally {
    if (publicPath) await mediaStorage.remove(publicPath, { namespace: "posts" });
  }
});

test("spoofed and unsupported image uploads are rejected", async () => {
  const app = createUploadApp();

  await withServer(app, async (baseUrl) => {
    const spoofed = await fetch(`${baseUrl}/upload`, {
      method: "POST",
      body: imageForm(Buffer.from("<script>alert(1)</script>")),
    });
    const spoofedBody = await spoofed.json();
    assert.equal(spoofed.status, 415, JSON.stringify(spoofedBody));
    assert.equal(spoofedBody.code, "UPLOAD_CONTENT_INVALID");

    const unsupported = await fetch(`${baseUrl}/upload`, {
      method: "POST",
      body: imageForm(validPng, { filename: "image.svg", mimeType: "image/svg+xml" }),
    });
    assert.equal(unsupported.status, 415);
    assert.equal((await unsupported.json()).code, "UPLOAD_TYPE_INVALID");
  });
});

test("oversized, missing, and malformed multipart uploads return safe errors", async () => {
  const app = createUploadApp();

  await withServer(app, async (baseUrl) => {
    const oversized = await fetch(`${baseUrl}/upload`, {
      method: "POST",
      body: imageForm(Buffer.alloc(config.uploads.maxFileBytes + 1), { filename: "large.png" }),
    });
    assert.equal(oversized.status, 413);
    assert.equal((await oversized.json()).code, "UPLOAD_TOO_LARGE");

    const missing = await fetch(`${baseUrl}/upload`, {
      method: "POST",
      body: new FormData(),
    });
    assert.equal(missing.status, 400);
    assert.equal((await missing.json()).code, "UPLOAD_REQUIRED");

    const malformed = await fetch(`${baseUrl}/upload`, {
      method: "POST",
      headers: { "Content-Type": "multipart/form-data" },
      body: "not-a-multipart-body",
    });
    assert.equal(malformed.status, 400);
    assert.equal((await malformed.json()).code, "UPLOAD_MALFORMED");
  });
});

test("the real upload route rejects unauthenticated requests before parsing files", async () => {
  const app = express();
  app.use("/api/upload", uploadRoutes);
  app.use(errorHandler);

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/upload`, {
      method: "POST",
      body: imageForm(validPng),
    });
    assert.equal(response.status, 401);
    assert.equal((await response.json()).code, "AUTH_REQUIRED");
  });
});

test("managed deletion refuses traversal and cross-namespace paths", async () => {
  assert.equal(
    await mediaStorage.remove("/api/uploads/posts/../../avatars/user.png", { namespace: "posts" }),
    false,
  );
  assert.equal(
    await mediaStorage.remove("/api/uploads/avatars/avatar-123-456.png", { namespace: "posts" }),
    false,
  );
  assert.equal(
    await mediaStorage.remove("C:\\private\\file.png", { namespace: "posts" }),
    false,
  );
});
