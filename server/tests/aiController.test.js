process.env.JWT_SECRET = "test_secret_test_secret_test_secret_1234";
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://unused-in-tests";

// Bypass real cookie/JWT auth entirely for controller-level tests — we only
// care about aiController's own logic here, not the auth middleware (which
// has its own dedicated test coverage in authRoutes.test.js).
jest.mock("../middleware/auth", () => ({
  protect: (req, res, next) => {
    req.user = { id: "507f1f77bcf86cd799439011" };
    next();
  },
}));

jest.mock("../config/db", () => jest.fn());
jest.mock("../models/AIHistory");
jest.mock("../services/geminiService", () => ({
  generateGeminiResponse: jest.fn(),
  generateInterviewQuestions: jest.fn(),
  evaluateInterviewAnswer: jest.fn(),
  generateFinalReport: jest.fn(),
}));

const request = require("supertest");
const AIHistory = require("../models/AIHistory");
const { generateGeminiResponse } = require("../services/geminiService");
const app = require("../server");

describe("POST /api/ai/generate", () => {
  afterEach(() => jest.clearAllMocks());

  it("rejects an empty prompt", async () => {
    const res = await request(app).post("/api/ai/generate").send({ prompt: "   " });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects a prompt over the length limit", async () => {
    const res = await request(app)
      .post("/api/ai/generate")
      .send({ prompt: "a".repeat(4001) });
    expect(res.status).toBe(400);
  });

  it("generates a response, defaults category to General, and persists history", async () => {
    generateGeminiResponse.mockResolvedValue("Here is your answer.");
    AIHistory.create.mockResolvedValue({
      _id: "hist1",
      prompt: "Explain closures",
      response: "Here is your answer.",
      category: "General",
    });

    const res = await request(app).post("/api/ai/generate").send({ prompt: "Explain closures" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.response).toBe("Here is your answer.");
    expect(generateGeminiResponse).toHaveBeenCalledWith("Explain closures", "General");
    expect(AIHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "507f1f77bcf86cd799439011",
        prompt: "Explain closures",
        response: "Here is your answer.",
        category: "General",
      })
    );
  });

  it("passes through a custom category", async () => {
    generateGeminiResponse.mockResolvedValue("A system design answer.");
    AIHistory.create.mockResolvedValue({});

    await request(app)
      .post("/api/ai/generate")
      .send({ prompt: "Design a URL shortener", category: "System Design" });

    expect(generateGeminiResponse).toHaveBeenCalledWith("Design a URL shortener", "System Design");
  });

  it("surfaces an upstream Gemini failure as a 5xx instead of crashing", async () => {
    generateGeminiResponse.mockRejectedValue(new Error("Gemini generateContent timed out after 20000ms"));

    const res = await request(app).post("/api/ai/generate").send({ prompt: "Explain closures" });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(AIHistory.create).not.toHaveBeenCalled();
  });
});
