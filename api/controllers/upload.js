import { ApiError } from "../errors/ApiError.js";

export const uploadImage = (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "An image file is required", "UPLOAD_REQUIRED");
  }
  // Preserve the existing JSON string response while returning a portable,
  // API-relative reference rather than an environment-specific absolute URL.
  return res.status(200).json(req.file.publicPath);
};
