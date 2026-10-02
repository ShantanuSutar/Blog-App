import path from "node:path";
import { fileURLToPath } from "node:url";

import multer from "multer";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const uploadDirectory = path.resolve(currentDirectory, "../../client/public/upload");
const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const uniqueName = `post-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    callback(null, uniqueName);
  },
});

export const uploadPostImage = multer({
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

export const uploadImage = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "An image file is required" });
  }
  return res.status(200).json(req.file.filename);
};
