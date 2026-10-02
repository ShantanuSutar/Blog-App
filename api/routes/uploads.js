import express from "express";

import { uploadImage, uploadPostImage } from "../controllers/upload.js";
import { requireAuth } from "../middleware/auth.js";
import { uploadLimiter } from "../middleware/security.js";

const router = express.Router();

router.post("/", requireAuth, uploadLimiter, uploadPostImage.single("file"), uploadImage);

export default router;
