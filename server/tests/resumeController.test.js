process.env.JWT_SECRET = "test_secret_test_secret_test_secret_1234";
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://unused-in-tests";

const OWNER_ID = "507f1f77bcf86cd799439011";

jest.mock("../middleware/auth", () => ({
  protect: (req, res, next) => {
    req.user = { id: OWNER_ID };
    next();
  },
}));

jest.mock("../config/db", () => jest.fn());
jest.mock("../models/Interview");
jest.mock("../services/geminiService", () => ({
  generateGeminiResponse: jest.fn(),
  generateInterviewQuestions: jest.fn(),
  evaluateInterviewAnswer: jest.fn(),
  generateFinalReport: jest.fn(),
}));
jest.mock("mammoth", () => ({ extractRawText: jest.fn() }));
jest.mock("pdf-parse", () => jest.fn(), { virtual: true });

const request = require("supertest");
const mammoth = require("mammoth");
const app = require("../server");

describe("POST /api/interviews/parse-resume", () => {
  afterEach(() => jest.clearAllMocks());

  it("returns 400 when no file is attached", async () => {
    const res = await request(app).post("/api/interviews/parse-resume");
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no resume file/i);
  });

  it("rejects a file type outside pdf/docx/txt", async () => {
    const res = await request(app)
      .post("/api/interviews/parse-resume")
      .attach("resume", Buffer.from("<html>not a resume</html>"), {
        filename: "resume.html",
        contentType: "text/html",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/unsupported file type/i);
  });

  it("extracts and normalizes text from a .txt resume", async () => {
    const raw = "John Doe\r\nSoftware Engineer\r\n\r\n\r\n5 years experience.";
    const res = await request(app)
      .post("/api/interviews/parse-resume")
      .attach("resume", Buffer.from(raw, "utf-8"), {
        filename: "resume.txt",
        contentType: "text/plain",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.fileName).toBe("resume.txt");
    // CRLF normalized to LF and runs of 3+ blank lines collapsed to one blank line
    expect(res.body.resumeText).not.toMatch(/\r/);
    expect(res.body.resumeText).not.toMatch(/\n{3,}/);
    expect(res.body.resumeText).toContain("Software Engineer");
  });

  it("returns 422 when the extracted text is empty (e.g. a scanned/image-only doc)", async () => {
    const res = await request(app)
      .post("/api/interviews/parse-resume")
      .attach("resume", Buffer.from("   \n\n   "), {
        filename: "resume.txt",
        contentType: "text/plain",
      });

    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/could not extract/i);
  });

  it("extracts text from a .docx resume via mammoth", async () => {
    mammoth.extractRawText.mockResolvedValue({ value: "Jane Smith - Full Stack Engineer" });

    const res = await request(app)
      .post("/api/interviews/parse-resume")
      .attach("resume", Buffer.from("fake docx bytes"), {
        filename: "resume.docx",
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

    expect(res.status).toBe(200);
    expect(res.body.resumeText).toContain("Jane Smith");
    expect(mammoth.extractRawText).toHaveBeenCalled();
  });

  it("truncates extracted text longer than 20,000 characters", async () => {
    const longText = "a".repeat(25000);
    const res = await request(app)
      .post("/api/interviews/parse-resume")
      .attach("resume", Buffer.from(longText), {
        filename: "resume.txt",
        contentType: "text/plain",
      });

    expect(res.status).toBe(200);
    expect(res.body.resumeText.length).toBe(20000);
  });

  it("rejects a file over the 5MB limit", async () => {
    const oversized = Buffer.alloc(6 * 1024 * 1024, "a");
    const res = await request(app)
      .post("/api/interviews/parse-resume")
      .attach("resume", oversized, { filename: "resume.txt", contentType: "text/plain" });

    expect(res.status).toBe(400);
  });
});
