const crypto = require("crypto");
const User = require("../models/User");
const { sendEmail } = require("../utils/sendEmail");
const logger = require("../utils/logger");
const {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
  cookieOptions,
  REFRESH_TOKEN_TTL_MS,
  ACCESS_TOKEN_COOKIE_MAX_AGE,
} = require("../utils/tokenUtils");

const ACCESS_COOKIE = "accessToken";
const REFRESH_COOKIE = "refreshToken";
// Refresh cookie is scoped to the one route that consumes it, so it's never
// sent (and never exposed to) any other endpoint or origin.
const REFRESH_COOKIE_PATH = "/api/auth/refresh";

const requestMeta = (req) => ({
  ip: req.ip,
  userAgent: req.headers["user-agent"],
});

// Sets both cookies for a freshly authenticated session.
const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(ACCESS_TOKEN_COOKIE_MAX_AGE));
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...cookieOptions(REFRESH_TOKEN_TTL_MS),
    path: REFRESH_COOKIE_PATH,
  });
};

const clearAuthCookies = (res) => {
  res.clearCookie(ACCESS_COOKIE, { path: "/" });
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
});

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error("Please provide name, email, and password");
    }

    if (password.length < 6) {
      res.status(400);
      throw new Error("Password must be at least 6 characters long");
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      res.status(400);
      throw new Error("User with this email already exists");
    }

    const user = await User.create({ name, email: email.toLowerCase(), password });

    if (!user) {
      res.status(400);
      throw new Error("Invalid user data provided");
    }

    const accessToken = signAccessToken(user);
    const refreshToken = await issueRefreshToken(user, requestMeta(req));
    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error("Please provide email and password");
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

    if (!user || !(await user.matchPassword(password))) {
      res.status(401);
      throw new Error("Invalid email or password");
    }

    const accessToken = signAccessToken(user);
    const refreshToken = await issueRefreshToken(user, requestMeta(req));
    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      success: true,
      message: "Login successful",
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Exchange a valid refresh token cookie for a new access+refresh pair
// @route   POST /api/auth/refresh
// @access  Public (requires refreshToken cookie)
const refreshToken = async (req, res, next) => {
  try {
    const rawToken = req.cookies?.[REFRESH_COOKIE];

    if (!rawToken) {
      res.status(401);
      throw new Error("No refresh token provided");
    }

    const rotated = await rotateRefreshToken(rawToken, requestMeta(req));

    if (!rotated) {
      clearAuthCookies(res);
      res.status(401);
      throw new Error("Refresh token is invalid or has expired, please log in again");
    }

    const accessToken = signAccessToken(rotated.user);
    setAuthCookies(res, accessToken, rotated.rawToken);

    res.json({ success: true, user: publicUser(rotated.user) });
  } catch (error) {
    next(error);
  }
};

// @desc    Log out of the current session only
// @route   POST /api/auth/logout
// @access  Public (cookie-based; no-op if already logged out)
const logoutUser = async (req, res, next) => {
  try {
    const rawToken = req.cookies?.[REFRESH_COOKIE];
    if (rawToken) {
      await revokeRefreshToken(rawToken);
    }
    clearAuthCookies(res);
    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

// @desc    Log out of every session for the current user (all devices)
// @route   POST /api/auth/logout-all
// @access  Private
const logoutAllSessions = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("+tokenVersion");
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save({ validateBeforeSave: false });
    await revokeAllRefreshTokensForUser(user._id);

    clearAuthCookies(res);
    res.json({ success: true, message: "Logged out of all sessions" });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Request a password reset email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: (email || "").toLowerCase() });

    // Always respond with the same message whether or not the account
    // exists, so this endpoint can't be used to enumerate registered emails.
    const genericMessage =
      "If an account with that email exists, a password reset link has been sent.";

    if (!user) {
      return res.json({ success: true, message: genericMessage });
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    const text = `You requested a password reset.\n\nClick the link below to set a new password (valid for 15 minutes):\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`;
    const html = `
      <p>You requested a password reset.</p>
      <p><a href="${resetUrl}">Click here to set a new password</a> (valid for 15 minutes).</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `;

    try {
      await sendEmail({ to: user.email, subject: "Password Reset Request", text, html });
    } catch (emailError) {
      logger.error({ err: emailError.message }, "Send Email Error");
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      res.status(500);
      throw new Error("Failed to send password reset email. Please try again later.");
    }

    res.json({ success: true, message: genericMessage });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using a valid reset token
// @route   PUT /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;

    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select("+password +resetPasswordToken +resetPasswordExpire +tokenVersion");

    if (!user) {
      res.status(400);
      throw new Error("Password reset token is invalid or has expired");
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    // A password reset should kill every existing session — both the
    // refresh tokens (revoked below) and any access token already in the
    // wild (invalidated instantly via the version bump, no waiting for
    // its 15-minute expiry).
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    await revokeAllRefreshTokensForUser(user._id);

    const accessToken = signAccessToken(user);
    const newRefreshToken = await issueRefreshToken(user, requestMeta(req));
    setAuthCookies(res, accessToken, newRefreshToken);

    res.json({
      success: true,
      message: "Password has been reset successfully",
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
  logoutAllSessions,
  getMe,
  forgotPassword,
  resetPassword,
};
