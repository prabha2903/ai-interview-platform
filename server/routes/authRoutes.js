const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
  logoutAllSessions,
  getMe,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const { authLimiter, passwordResetLimiter } = require("../middleware/rateLimiter");
const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} = require("../middleware/validators");

router.post("/register", authLimiter, registerValidation, registerUser);
router.post("/login", authLimiter, loginValidation, loginUser);
router.post("/refresh", authLimiter, refreshToken);
router.post("/logout", logoutUser);
router.post("/logout-all", protect, logoutAllSessions);
router.get("/me", protect, getMe);
router.post("/forgot-password", passwordResetLimiter, forgotPasswordValidation, forgotPassword);
router.put("/reset-password/:token", passwordResetLimiter, resetPasswordValidation, resetPassword);

module.exports = router;
