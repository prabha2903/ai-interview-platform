const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

describe("User model", () => {
  it("matchPassword correctly compares a bcrypt hash against plaintext", async () => {
    const user = new User({ name: "Jane Doe", email: "jane@example.com", password: "placeholder" });

    // Simulate what the pre-save hook does, without touching a real database.
    const hashed = await bcrypt.hash("plaintext123", await bcrypt.genSalt(10));
    user.password = hashed;

    await expect(user.matchPassword("plaintext123")).resolves.toBe(true);
    await expect(user.matchPassword("wrongpassword")).resolves.toBe(false);
  });

  it("generates a reset token and stores only its SHA-256 hash, with a future expiry", () => {
    const user = new User({ name: "Jane Doe", email: "jane@example.com", password: "hashedvalue" });

    const rawToken = user.getResetPasswordToken();
    const expectedHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    expect(rawToken).toHaveLength(64); // 32 bytes hex-encoded
    expect(user.resetPasswordToken).toBe(expectedHash);
    expect(user.resetPasswordToken).not.toBe(rawToken);
    expect(user.resetPasswordExpire.getTime()).toBeGreaterThan(Date.now());
  });

  it("toJSON strips password and reset-token fields from serialized output", () => {
    const user = new User({ name: "Jane Doe", email: "jane@example.com", password: "hashedvalue" });
    user.getResetPasswordToken();

    const safe = user.toJSON();

    expect(safe.password).toBeUndefined();
    expect(safe.resetPasswordToken).toBeUndefined();
    expect(safe.resetPasswordExpire).toBeUndefined();
    expect(safe.name).toBe("Jane Doe");
  });
});
