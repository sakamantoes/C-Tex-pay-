import express from "express";

import {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
} from "../controller/auth.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../validation/auth.schemas.js";

const router = express.Router();

router.post("/register", validate(registerSchema), register);

router.post("/login", validate(loginSchema), login);

router.post("/logout", validate(logoutSchema), logout);

router.post("/refresh", validate(refreshTokenSchema), refreshToken);

router.get("/me", protect, getMe);

router.post("/verify-email", validate(verifyEmailSchema), verifyEmail);

router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);

router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

router.post(
  "/change-password",
  protect,
  validate(changePasswordSchema),
  changePassword
);

export default router;