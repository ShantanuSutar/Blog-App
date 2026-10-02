import path from "node:path";

import multer from "multer";

import { config } from "../config.js";
import { ApiError } from "../errors/ApiError.js";
import { mediaStorage } from "../services/mediaStorage.js";
import { acceptedImageTypes, detectImageFile } from "../utils/imageFile.js";

const createFileFilter = (allowedTypeNames) => {
  const allowedTypes = allowedTypeNames.map((name) => acceptedImageTypes[name]);
  const allowedMimeTypes = new Set(allowedTypes.map((type) => type.mimeType));
  const allowedExtensions = new Set(allowedTypes.flatMap((type) => type.inputExtensions));

  return (req, file, callback) => {
    const extension = path.extname(path.basename(file.originalname)).toLowerCase();
    if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(extension)) {
      callback(new ApiError(
        415,
        "Only supported image files can be uploaded",
        "UPLOAD_TYPE_INVALID",
      ));
      return;
    }
    callback(null, true);
  };
};

const malformedUploadError = (error) => {
  if (error instanceof ApiError || error instanceof multer.MulterError) return error;
  return new ApiError(400, "The multipart upload is malformed", "UPLOAD_MALFORMED", undefined, {
    cause: error,
  });
};

export const createImageUpload = ({ fieldName, namespace, allowedTypeNames }) => {
  const parser = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: config.uploads.maxFileBytes,
      files: 1,
      fields: 0,
      // Busboy signals the limit as soon as it reaches the configured count,
      // so allow the single file part plus the terminating boundary.
      parts: 2,
      fieldNameSize: 100,
      headerPairs: 100,
    },
    fileFilter: createFileFilter(allowedTypeNames),
  }).single(fieldName);

  return (req, res, next) => {
    parser(req, res, async (parseError) => {
      if (parseError) {
        next(malformedUploadError(parseError));
        return;
      }
      if (!req.file) {
        next();
        return;
      }

      const detected = detectImageFile(req.file.buffer);
      const originalExtension = path.extname(path.basename(req.file.originalname)).toLowerCase();
      const isAllowed = detected
        && allowedTypeNames.some(
          (name) => acceptedImageTypes[name].mimeType === detected.mimeType,
        )
        && detected.mimeType === req.file.mimetype
        && detected.inputExtensions.includes(originalExtension);

      if (!isAllowed) {
        next(new ApiError(
          415,
          "The uploaded file content is not a valid supported image",
          "UPLOAD_CONTENT_INVALID",
        ));
        return;
      }

      const pixels = detected.width * detected.height;
      if (
        !Number.isSafeInteger(pixels)
        || detected.width < 1
        || detected.height < 1
        || pixels > config.uploads.maxPixels
      ) {
        next(new ApiError(
          413,
          "The uploaded image dimensions are too large",
          "UPLOAD_DIMENSIONS_TOO_LARGE",
        ));
        return;
      }

      try {
        const stored = await mediaStorage.save({
          buffer: req.file.buffer,
          namespace,
          extension: detected.extension,
        });
        req.file = {
          ...req.file,
          buffer: undefined,
          filename: stored.filename,
          storageKey: stored.key,
          publicPath: stored.publicPath,
          detectedMimeType: detected.mimeType,
          width: detected.width,
          height: detected.height,
        };
        next();
      } catch (error) {
        next(error);
      }
    });
  };
};
