const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const RefreshToken = require("../models/RefreshToken");

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const REFRESH_TOKEN_BYTES = 48;

// Short-lived JWT. Embeds tokenVersion so it can be invalidated instantly
// (password reset / "log out everywhere") without a blacklist lookup on
// every request — the auth middleware just compares versions.
const signAccessToken = (user) =>
  jwt.sign({ id: user._id.toString(), tokenVersion: user.tokenVersion || 0 }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });

// Issues a brand-new refresh token (used at login/register, where there's no
// prior token to rotate). Only the SHA-256 hash is persisted.
const issueRefreshToken = async (user, meta = {}) => {
  const rawToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
  await RefreshToken.create({
    user: user._id,
    tokenHash: RefreshToken.hash(rawToken),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    createdByIp: meta.ip || null,
    userAgent: meta.userAgent || null,
  });
  return rawToken;
};

// Redeems + rotates a refresh token in one step: looks it up by hash,
// confirms it's live and unrevoked, marks it used, and issues a new one in
// its place. Returns null for any invalid/expired/already-used token so the
// caller can treat it as "not authenticated" without leaking which case it was.
//
// Reuse of an already-rotated token (its hash matches a row that's already
// revoked) is a strong signal of token theft — we treat that the same as any
// other failure here, but callers may additionally want to revoke the whole
// family; kept simple for this app's scale.
const rotateRefreshToken = async (rawToken, meta = {}) => {
  if (!rawToken) return null;

  const tokenHash = RefreshToken.hash(rawToken);
  const existing = await RefreshToken.findOne({ tokenHash }).populate("user");

  if (!existing || existing.revokedAt || existing.expiresAt < new Date() || !existing.user) {
    return null;
  }

  const newRawToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("hex");

  existing.revokedAt = new Date();
  existing.replacedByTokenHash = RefreshToken.hash(newRawToken);
  await existing.save();

  await RefreshToken.create({
    user: existing.user._id,
    tokenHash: existing.replacedByTokenHash,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    createdByIp: meta.ip || null,
    userAgent: meta.userAgent || null,
  });

  return { user: existing.user, rawToken: newRawToken };
};

// Revokes a single refresh token (used on explicit logout of one session).
const revokeRefreshToken = async (rawToken) => {
  if (!rawToken) return;
  await RefreshToken.updateOne(
    { tokenHash: RefreshToken.hash(rawToken), revokedAt: null },
    { revokedAt: new Date() }
  );
};

// Revokes every refresh token for a user (used on password reset / "log out
// everywhere"). Combine with bumping user.tokenVersion so already-issued
// access tokens die too, not just refresh tokens.
const revokeAllRefreshTokensForUser = async (userId) => {
  await RefreshToken.updateMany({ user: userId, revokedAt: null }, { revokedAt: new Date() });
};

// Cookie flags shared by both tokens. `secure` + `sameSite: none` is required
// for cross-site cookies in production (client and API on different origins);
// in local dev over plain HTTP, browsers reject `secure` cookies, so we fall
// back to `lax` + non-secure there.
const cookieOptions = (maxAgeMs) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: maxAgeMs,
  path: "/",
});

const ACCESS_TOKEN_COOKIE_MAX_AGE = 15 * 60 * 1000; // matches ACCESS_TOKEN_TTL default

module.exports = {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
  cookieOptions,
  REFRESH_TOKEN_TTL_MS,
  ACCESS_TOKEN_COOKIE_MAX_AGE,
};
