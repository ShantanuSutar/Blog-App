import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import multer from "multer";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
export const avatarUploadDirectory = path.resolve(currentDirectory, "../uploads/avatars");

const allowedExtensions = new Set([".jpeg", ".jpg", ".png", ".webp"]);
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    fs.mkdir(avatarUploadDirectory, { recursive: true })
      .then(() => callback(null, avatarUploadDirectory))
      .catch(callback);
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(
      null,
      `avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`,
    );
  },
});

export const avatarUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.has(extension) && allowedMimeTypes.has(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
  },
});
