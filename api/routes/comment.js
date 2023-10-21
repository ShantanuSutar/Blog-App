import express from "express";
import { addComment, getComment } from "../controllers/comment.js";

const router = express.Router();

router.post("/:id", addComment);
router.get("/:id", getComment);

export default router;
