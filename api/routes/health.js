import express from "express";
import { checkHealth, ping } from "../controllers/health.js";

const router = express.Router();

router.get("/", checkHealth);
// Retain the original nested path for compatibility.
router.get("/health", checkHealth);
router.get("/ping", ping);

export default router;
