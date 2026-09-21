import express from "express";
import { getProfile, updateProfile, uploadAvatar, deleteAvatar, searchUsers, upload } from "../controllers/user.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Search users for @mentions (must be before /:username route)
router.get("/search", searchUsers);

// Public route - get user profile
router.get("/:username", optionalAuth, getProfile);

// Protected routes - require authentication
router.put("/:id", requireAuth, updateProfile);
router.post("/:id/avatar", requireAuth, upload.single("avatar"), uploadAvatar);
router.delete("/:id/avatar", requireAuth, deleteAvatar);

export default router;
