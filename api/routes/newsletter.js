import express from "express";
import { subscribe, unsubscribe } from "../controllers/newsletter.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = express.Router();

router.post("/", asyncHandler(subscribe));
router.get("/unsubscribe", asyncHandler(unsubscribe));
router.post("/unsubscribe", asyncHandler(unsubscribe));

export default router;
