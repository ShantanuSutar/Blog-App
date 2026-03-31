import express from "express";
import { getProfile, updateProfile, uploadAvatar, deleteAvatar, upload } from "../controllers/user.js";

const router = express.Router();

// Public route - get user profile
router.get("/:username", getProfile);

// Protected routes - require authentication
router.put("/:id", updateProfile);
router.post("/:id/avatar", upload.single("avatar"), uploadAvatar);
router.delete("/:id/avatar", deleteAvatar);

export default router;
