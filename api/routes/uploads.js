import express from "express";

import { uploadImage, uploadPostImage } from "../controllers/upload.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/", requireAuth, uploadPostImage.single("file"), uploadImage);

export default router;
