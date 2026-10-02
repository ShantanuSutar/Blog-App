import express from "express";
import { addComment, getComment } from "../controllers/comment.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = express.Router();

router.post("/:id", requireAuth, asyncHandler(addComment));
router.get("/:id", asyncHandler(getComment));

export default router;
