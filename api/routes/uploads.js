import express from "express";

import { uploadImage } from "../controllers/upload.js";
import { requireAuth } from "../middleware/auth.js";
import { createImageUpload } from "../middleware/imageUpload.js";
import { uploadLimiter } from "../middleware/security.js";

const router = express.Router();

const postImageUpload = createImageUpload({
  fieldName: "file",
  namespace: "posts",
  allowedTypeNames: ["jpeg", "png", "webp", "gif"],
});

router.post("/", requireAuth, uploadLimiter, postImageUpload, uploadImage);

export default router;
