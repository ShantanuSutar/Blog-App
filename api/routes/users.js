import express from "express";
import { getProfile, updateProfile, uploadAvatar, deleteAvatar, searchUsers } from "../controllers/user.js";
import { avatarUpload } from "../middleware/avatarUpload.js";
import { optionalAuth, requireAuth, requireSelf } from "../middleware/auth.js";

const router = express.Router();

// Search users for @mentions (must be before /:username route)
router.get("/search", searchUsers);

// Public route - get user profile
router.get("/:username", optionalAuth, getProfile);

// Protected routes - require authentication
router.put("/:id", requireAuth, requireSelf, updateProfile);
router.post("/:id/avatar", requireAuth, requireSelf, avatarUpload.single("avatar"), uploadAvatar);
router.delete("/:id/avatar", requireAuth, requireSelf, deleteAvatar);

export default router;
