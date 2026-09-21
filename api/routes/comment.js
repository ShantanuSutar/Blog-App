import express from "express";
import { addComment, getComment } from "../controllers/comment.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/:id", requireAuth, addComment);
router.get("/:id", getComment);

export default router;
