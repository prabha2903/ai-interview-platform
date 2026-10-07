process.env.JWT_SECRET = "test_secret_test_secret_test_secret_1234"; // 32+ chars
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://unused-in-tests";

jest.mock("../models/User");
jest.mock("../models/RefreshToken");
jest.mock("../config/db", () => jest.fn()); // never actually connect during tests
jest.mock("../utils/sendEmail", () => ({
  sendEmail: jest.fn().mockResolvedValue({ delivered: false, mode: "console" }),
}));

const request = require("supertest");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const app = require("../server");

// Helper: pull a specific cookie's value out of a supertest response's
// Set-Cookie header array.
const getCookie = (res, name) => {
  const cookies = res.headers["set-cookie"] || [];
  const match = cookies.find((c) => c.startsWith(`${name}=`));
  if (!match) return null;
  return match.split(";")[0].split("=")[1];
};

describe("Auth routes", () => {
  beforeEach(() => {
    RefreshToken.hash = jest.fn((raw) => `hashed-${raw}`);
    RefreshToken.create = jest.fn().mockResolvedValue({});
    RefreshToken.findOne = jest.fn();
    RefreshToken.updateOne = jest.fn().mockResolvedValue({});
    RefreshToken.updateMany = jest.fn().mockResolvedValue({});
  });

  afterEach(() => jest.clearAllMocks());

  describe("POST /api/auth/register", () => {
    it("returns 400 when required fields are missing", async () => {
      const res = await request(app).post("/api/auth/register").send({ email: "a@b.com" });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("registers a new user and sets httpOnly auth cookies (no token in the body)", async () => {
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        name: "Jane",
        email: "jane@example.com",
        createdAt: new Date(),
        tokenVersion: 0,
      });

      const res = await request(app)
        .post("/api/auth/register")
        .send({ name: "Jane", email: "jane@example.com", password: "secret123" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeUndefined(); // no longer exposed to JS
      expect(res.body.user.email).toBe("jane@example.com");

      const accessCookie = getCookie(res, "accessToken");
      const refreshCookie = getCookie(res, "refreshToken");
      expect(accessCookie).toBeTruthy();
      expect(refreshCookie).toBeTruthy();

      const setCookieHeader = res.headers["set-cookie"].join(";");
      expect(setCookieHeader).toMatch(/HttpOnly/i);
    });

    it("rejects registration for an email that already exists", async () => {
      User.findOne.mockResolvedValue({ _id: "existing", email: "jane@example.com" });

      const res = await request(app)
        .post("/api/auth/register")
        .send({ name: "Jane", email: "jane@example.com", password: "secret123" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already exists/i);
    });
  });

  describe("POST /api/auth/login", () => {
    it("rejects invalid credentials", async () => {
      const mockUser = { matchPassword: jest.fn().mockResolvedValue(false) };
      User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "jane@example.com", password: "wrongpassword" });

      expect(res.status).toBe(401);
    });

    it("logs in successfully and sets auth cookies", async () => {
      const mockUser = {
        _id: "507f1f77bcf86cd799439011",
        name: "Jane",
        email: "jane@example.com",
        createdAt: new Date(),
        tokenVersion: 0,
        matchPassword: jest.fn().mockResolvedValue(true),
      };
      User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "jane@example.com", password: "secret123" });

      expect(res.status).toBe(200);
      expect(getCookie(res, "accessToken")).toBeTruthy();
      expect(getCookie(res, "refreshToken")).toBeTruthy();
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("returns 401 when no refresh cookie is present", async () => {
      const res = await request(app).post("/api/auth/refresh");
      expect(res.status).toBe(401);
    });

    it("rotates a valid refresh token and issues a new pair", async () => {
      const mockUser = {
        _id: "507f1f77bcf86cd799439011",
        name: "Jane",
        email: "jane@example.com",
        createdAt: new Date(),
        tokenVersion: 0,
      };

      const existingDoc = {
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        user: mockUser,
        save: jest.fn().mockResolvedValue(true),
      };
      RefreshToken.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(existingDoc),
      });

      const res = await request(app).post("/api/auth/refresh").set("Cookie", ["refreshToken=some-raw-token"]);

      expect(res.status).toBe(200);
      expect(existingDoc.save).toHaveBeenCalled(); // old token marked revoked
      expect(RefreshToken.create).toHaveBeenCalled(); // new token issued
      expect(getCookie(res, "accessToken")).toBeTruthy();
    });

    it("rejects an already-revoked (reused) refresh token", async () => {
      RefreshToken.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          revokedAt: new Date(),
          expiresAt: new Date(Date.now() + 100000),
          user: { _id: "u1" },
        }),
      });

      const res = await request(app).post("/api/auth/refresh").set("Cookie", ["refreshToken=stolen-token"]);
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("clears auth cookies even with no session", async () => {
      const res = await request(app).post("/api/auth/logout");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("POST /api/auth/forgot-password", () => {
    it("returns a generic success message even when the account doesn't exist", async () => {
      User.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "ghost@example.com" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("generates and saves a reset token for an existing account", async () => {
      const save = jest.fn().mockResolvedValue(true);
      const mockUser = {
        email: "jane@example.com",
        getResetPasswordToken: jest.fn().mockReturnValue("raw-token"),
        save,
      };
      User.findOne.mockResolvedValue(mockUser);

      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "jane@example.com" });

      expect(res.status).toBe(200);
      expect(mockUser.getResetPasswordToken).toHaveBeenCalled();
      expect(save).toHaveBeenCalled();
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns 401 when no token is provided", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
    });

    it("returns 401 when the token's tokenVersion doesn't match the user's current version (revoked session)", async () => {
      const jwt = require("jsonwebtoken");
      const staleToken = jwt.sign({ id: "507f1f77bcf86cd799439011", tokenVersion: 0 }, process.env.JWT_SECRET, {
        expiresIn: "15m",
      });

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: "507f1f77bcf86cd799439011",
          tokenVersion: 1, // bumped since this token was issued
        }),
      });

      const res = await request(app).get("/api/auth/me").set("Cookie", [`accessToken=${staleToken}`]);
      expect(res.status).toBe(401);
    });
  });
});
