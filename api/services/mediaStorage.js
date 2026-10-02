import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "../config.js";
import { ApiError } from "../errors/ApiError.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const apiDirectory = path.resolve(currentDirectory, "..");
const configuredDirectory = config.uploads.localDirectory;

export const mediaRootDirectory = path.isAbsolute(configuredDirectory)
  ? path.resolve(configuredDirectory)
  : path.resolve(apiDirectory, configuredDirectory);

const namespaces = new Set(["avatars", "posts"]);
const managedFilename = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|avatar-\d+-\d+)\.(?:jpe?g|png|webp|gif)$/i;

const namespaceDirectory = (namespace) => {
  if (!namespaces.has(namespace)) {
    throw new ApiError(500, "Upload storage is not configured", "UPLOAD_STORAGE_ERROR");
  }
  return path.join(mediaRootDirectory, namespace);
};

const parseManagedPath = (publicPath, expectedNamespace) => {
  if (typeof publicPath !== "string") return null;
  const match = publicPath.match(/^\/api\/uploads\/(avatars|posts)\/([^/]+)$/);
  if (!match || match[1] !== expectedNamespace || !managedFilename.test(match[2])) return null;
  return { namespace: match[1], filename: match[2] };
};

const localStorage = Object.freeze({
  async save({ buffer, namespace, extension }) {
    const directory = namespaceDirectory(namespace);
    await fs.mkdir(directory, { recursive: true });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const filename = `${crypto.randomUUID()}${extension}`;
      const filePath = path.join(directory, filename);
      try {
        await fs.writeFile(filePath, buffer, { flag: "wx", mode: 0o600 });
        return {
          filename,
          key: `${namespace}/${filename}`,
          publicPath: `/api/uploads/${namespace}/${filename}`,
        };
      } catch (error) {
        if (error.code !== "EEXIST") {
          throw new ApiError(500, "Unable to store the uploaded image", "UPLOAD_STORAGE_ERROR", undefined, {
            cause: error,
          });
        }
      }
    }
    throw new ApiError(500, "Unable to store the uploaded image", "UPLOAD_STORAGE_ERROR");
  },

  async remove(publicPath, { namespace }) {
    const managed = parseManagedPath(publicPath, namespace);
    if (!managed) return false;

    const directory = namespaceDirectory(managed.namespace);
    const filePath = path.join(directory, managed.filename);
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if (error.code === "ENOENT") return false;
      throw error;
    }
  },
});

// Controllers depend on this narrow interface rather than the filesystem.
// A future S3/Cloudinary adapter only needs to implement save/remove and expose
// a compatible public reference; database fields can remain portable strings.
export const mediaStorage = localStorage;
