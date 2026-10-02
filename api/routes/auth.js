import express from "express";
import { register, login, logout } from "../controllers/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateRequest } from "../middleware/validate.js";
import { loginLimiter, registerLimiter } from "../middleware/security.js";
import { loginBody, registerBody } from "../validation/requests.js";

const router = express.Router();

router.post("/register", registerLimiter, validateRequest({ body: registerBody }), asyncHandler(register));
router.post("/login", loginLimiter, validateRequest({ body: loginBody }), asyncHandler(login));
router.post("/logout", logout);

export default router;
