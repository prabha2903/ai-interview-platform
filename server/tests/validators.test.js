const express = require("express");
const request = require("supertest");
const {
  registerValidation,
  loginValidation,
  createInterviewValidation,
} = require("../middleware/validators");

// Minimal app wiring each validation chain to a stub 200 handler, so we can
// assert on status codes/messages without touching real controllers or a DB.
const buildApp = (chain) => {
  const app = express();
  app.use(express.json());
  app.post("/test", chain, (req, res) => res.json({ success: true }));
  app.use((err, req, res, next) => {
    res.status(res.statusCode === 200 ? 400 : res.statusCode).json({ success: false, message: err.message });
  });
  return app;
};

describe("registerValidation", () => {
  const app = buildApp(registerValidation);

  it("rejects a missing email", async () => {
    const res = await request(app).post("/test").send({ name: "Jane", password: "secret123" });
    expect(res.status).toBe(400);
  });

  it("rejects a short password", async () => {
    const res = await request(app)
      .post("/test")
      .send({ name: "Jane", email: "jane@example.com", password: "123" });
    expect(res.status).toBe(400);
  });

  it("accepts a valid payload", async () => {
    const res = await request(app)
      .post("/test")
      .send({ name: "Jane", email: "jane@example.com", password: "secret123" });
    expect(res.status).toBe(200);
  });
});

describe("loginValidation", () => {
  const app = buildApp(loginValidation);

  it("rejects an invalid email format", async () => {
    const res = await request(app).post("/test").send({ email: "not-an-email", password: "secret123" });
    expect(res.status).toBe(400);
  });

  it("accepts a valid login payload", async () => {
    const res = await request(app).post("/test").send({ email: "jane@example.com", password: "secret123" });
    expect(res.status).toBe(200);
  });
});

describe("createInterviewValidation", () => {
  const app = buildApp(createInterviewValidation);

  it("rejects when resumeText and jobDescription are missing", async () => {
    const res = await request(app).post("/test").send({});
    expect(res.status).toBe(400);
  });

  it("rejects an invalid interviewType enum value", async () => {
    const res = await request(app)
      .post("/test")
      .send({ resumeText: "Experienced engineer", jobDescription: "Backend role", interviewType: "Nonsense" });
    expect(res.status).toBe(400);
  });

  it("accepts a valid interview creation payload", async () => {
    const res = await request(app).post("/test").send({
      resumeText: "Experienced engineer with 5 years in Node.js",
      jobDescription: "Looking for a backend engineer",
      interviewType: "Technical",
      difficulty: "Medium",
      questionCount: 5,
    });
    expect(res.status).toBe(200);
  });
});
