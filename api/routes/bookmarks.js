import express from "express";
import { addBookmark, removeBookmark, getBookmarks, checkBookmarkStatus } from "../controllers/bookmarks.js";

const router = express.Router();

router.get("/", getBookmarks);
router.post("/", addBookmark);
router.delete("/:postId", removeBookmark);
router.get("/check/:postId", checkBookmarkStatus);

export default router;
