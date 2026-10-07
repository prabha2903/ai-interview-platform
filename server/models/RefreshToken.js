const mongoose = require("mongoose");
const crypto = require("crypto");

// Refresh tokens are opaque random strings — never JWTs. Only their SHA-256
// hash is stored, so a DB leak alone can't be used to log in as anyone.
// Storing them server-side (rather than trusting a long-lived JWT) is what
// makes them revocable: logout, password reset, or "log out everywhere"
// simply deletes/marks rows here instead of waiting out a token's expiry.
const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    createdByIp: { type: String, default: null },
    userAgent: { type: String, default: null },
    revokedAt: { type: Date, default: null },
    // When a token is rotated, we keep a pointer to its replacement so reuse
    // of an already-rotated (stolen/replayed) token can be detected.
    replacedByTokenHash: { type: String, default: null },
  },
  { timestamps: true }
);

// TTL index: MongoDB automatically deletes documents shortly after
// `expiresAt` passes, so revoked/expired rows don't accumulate forever.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

refreshTokenSchema.statics.hash = function (rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
};

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);
