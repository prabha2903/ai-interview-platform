process.env.JWT_SECRET = "test_secret_test_secret_test_secret_1234";
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://unused-in-tests";

const OWNER_ID = "507f1f77bcf86cd799439011";
const OTHER_USER_ID = "507f1f77bcf86cd799439099";

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

const request = require("supertest");
const Interview = require("../models/Interview");
const {
  generateInterviewQuestions,
  evaluateInterviewAnswer,
  generateFinalReport,
} = require("../services/geminiService");
const app = require("../server");

const baseBody = {
  resumeText: "Experienced Node.js developer with React and MongoDB projects.",
  jobDescription: "Looking for a full-stack engineer skilled in the MERN stack.",
  targetRole: "Full Stack Engineer",
};

describe("Interview routes", () => {
  afterEach(() => jest.clearAllMocks());

  describe("POST /api/interviews", () => {
    it("rejects a request missing resumeText", async () => {
      const res = await request(app)
        .post("/api/interviews")
        .send({ jobDescription: baseBody.jobDescription });
      expect(res.status).toBe(400);
    });

    it("rejects an invalid interviewType", async () => {
      const res = await request(app)
        .post("/api/interviews")
        .send({ ...baseBody, interviewType: "Wizardry" });
      expect(res.status).toBe(400);
    });

    it("creates an interview when Gemini returns valid questions", async () => {
      generateInterviewQuestions.mockResolvedValue([
        {
          questionId: "q_1",
          category: "Technical",
          difficulty: "Medium",
          questionText: "Explain the event loop.",
          suggestedAnswer: "It handles async callbacks...",
          keyPoints: ["single-threaded", "non-blocking"],
        },
      ]);
      Interview.create.mockResolvedValue({
        _id: "interview1",
        userId: OWNER_ID,
        status: "pending",
        questions: [{ questionText: "Explain the event loop." }],
      });

      const res = await request(app).post("/api/interviews").send(baseBody);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(generateInterviewQuestions).toHaveBeenCalledWith(
        expect.objectContaining({
          resumeText: baseBody.resumeText,
          jobDescription: baseBody.jobDescription,
          interviewType: "Mixed",
          difficulty: "Medium",
          questionCount: 5,
        })
      );
    });

    it("returns 502 when Gemini returns no usable questions", async () => {
      generateInterviewQuestions.mockResolvedValue([]);

      const res = await request(app).post("/api/interviews").send(baseBody);

      expect(res.status).toBe(502);
      expect(Interview.create).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/interviews (pagination)", () => {
    it("applies default pagination (page 1, limit 20) and returns totalPages", async () => {
      Interview.countDocuments.mockResolvedValue(45);
      const query = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ _id: "i1" }]),
      };
      Interview.find.mockReturnValue(query);

      const res = await request(app).get("/api/interviews");

      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
      expect(res.body.totalCount).toBe(45);
      expect(res.body.totalPages).toBe(3);
      expect(query.skip).toHaveBeenCalledWith(0);
      expect(query.limit).toHaveBeenCalledWith(20);
    });

    it("caps an excessive ?limit at 50", async () => {
      Interview.countDocuments.mockResolvedValue(5);
      const query = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      Interview.find.mockReturnValue(query);

      await request(app).get("/api/interviews").query({ limit: 500, page: 2 });

      expect(query.limit).toHaveBeenCalledWith(50);
      expect(query.skip).toHaveBeenCalledWith(50); // (page 2 - 1) * 50
    });
  });

  describe("GET /api/interviews/:id (ownership)", () => {
    it("returns 404 when the interview doesn't exist", async () => {
      Interview.findById.mockResolvedValue(null);
      const res = await request(app).get("/api/interviews/interview1");
      expect(res.status).toBe(404);
    });

    it("returns 403 when the interview belongs to a different user", async () => {
      Interview.findById.mockResolvedValue({ _id: "interview1", userId: OTHER_USER_ID });
      const res = await request(app).get("/api/interviews/interview1");
      expect(res.status).toBe(403);
    });

    it("returns the interview when owned by the requesting user", async () => {
      Interview.findById.mockResolvedValue({ _id: "interview1", userId: OWNER_ID });
      const res = await request(app).get("/api/interviews/interview1");
      expect(res.status).toBe(200);
      expect(res.body.interview.userId).toBe(OWNER_ID);
    });
  });

  describe("POST /api/interviews/:id/answer", () => {
    const buildInterview = (overrides = {}) => ({
      _id: "interview1",
      userId: OWNER_ID,
      status: "in-progress",
      currentQuestionIndex: 0,
      resumeText: baseBody.resumeText,
      jobDescription: baseBody.jobDescription,
      questions: [
        {
          questionText: "Explain the event loop.",
          category: "Technical",
          difficulty: "Medium",
          followUps: [],
        },
      ],
      save: jest.fn().mockResolvedValue(true),
      ...overrides,
    });

    it("rejects an empty answer", async () => {
      const res = await request(app).post("/api/interviews/interview1/answer").send({ answer: "  " });
      expect(res.status).toBe(400);
    });

    it("rejects answering an already-completed interview", async () => {
      Interview.findById.mockResolvedValue(buildInterview({ status: "completed" }));
      const res = await request(app)
        .post("/api/interviews/interview1/answer")
        .send({ answer: "The event loop processes callbacks." });
      expect(res.status).toBe(400);
    });

    it("evaluates the main question and surfaces a follow-up when Gemini suggests one", async () => {
      const interview = buildInterview();
      Interview.findById.mockResolvedValue(interview);
      evaluateInterviewAnswer.mockResolvedValue({
        score: 80,
        correctness: 80,
        relevance: 90,
        technicalDepth: 70,
        completeness: 75,
        communicationQuality: 85,
        goodPoints: ["Clear explanation"],
        missingPoints: [],
        improvements: [],
        sampleAnswer: "A stronger answer would mention the call stack.",
        followUpQuestion: "How does the call stack interact with the event loop?",
      });

      const res = await request(app)
        .post("/api/interviews/interview1/answer")
        .send({ answer: "The event loop processes callbacks off the call stack." });

      expect(res.status).toBe(200);
      expect(res.body.awaitingFollowUp).toBe(true);
      expect(res.body.followUpQuestion).toMatch(/call stack/i);
      expect(interview.questions[0].followUps).toHaveLength(1);
      expect(interview.currentQuestionIndex).toBe(0); // not advanced yet — follow-up pending
      expect(interview.save).toHaveBeenCalled();
    });

    it("advances to the next question when no follow-up is suggested", async () => {
      const interview = buildInterview();
      Interview.findById.mockResolvedValue(interview);
      evaluateInterviewAnswer.mockResolvedValue({
        score: 90,
        correctness: 90,
        relevance: 90,
        technicalDepth: 90,
        completeness: 90,
        communicationQuality: 90,
        goodPoints: [],
        missingPoints: [],
        improvements: [],
        sampleAnswer: "",
        followUpQuestion: null,
      });

      const res = await request(app)
        .post("/api/interviews/interview1/answer")
        .send({ answer: "A thorough, complete answer." });

      expect(res.status).toBe(200);
      expect(res.body.awaitingFollowUp).toBeUndefined();
      expect(interview.currentQuestionIndex).toBe(1);
      expect(res.body.isLastQuestion).toBe(true);
    });

    it("answers a pending follow-up instead of re-answering the main question", async () => {
      const interview = buildInterview({
        questions: [
          {
            questionText: "Explain the event loop.",
            category: "Technical",
            difficulty: "Medium",
            userAnswer: "Initial answer",
            followUps: [{ questionText: "Follow-up?", userAnswer: null }],
          },
        ],
      });
      Interview.findById.mockResolvedValue(interview);
      evaluateInterviewAnswer.mockResolvedValue({
        score: 70,
        correctness: 70,
        relevance: 70,
        technicalDepth: 70,
        completeness: 70,
        communicationQuality: 70,
        goodPoints: [],
        missingPoints: [],
        improvements: [],
        sampleAnswer: "",
      });

      const res = await request(app)
        .post("/api/interviews/interview1/answer")
        .send({ answer: "Follow-up answer text." });

      expect(res.status).toBe(200);
      expect(res.body.type).toBe("followUpEvaluated");
      expect(interview.questions[0].followUps[0].userAnswer).toBe("Follow-up answer text.");
      expect(interview.currentQuestionIndex).toBe(1); // advances after the follow-up is resolved
      // evaluateInterviewAnswer should NOT be asked to allow a further follow-up
      expect(evaluateInterviewAnswer).toHaveBeenCalledWith(
        expect.objectContaining({ allowFollowUp: false })
      );
    });
  });

  describe("POST /api/interviews/:id/complete", () => {
    it("rejects completing an interview with zero answered questions", async () => {
      Interview.findById.mockResolvedValue({
        _id: "interview1",
        userId: OWNER_ID,
        status: "in-progress",
        questions: [{ questionText: "Q1", userAnswer: null }],
      });

      const res = await request(app).post("/api/interviews/interview1/complete");
      expect(res.status).toBe(400);
      expect(generateFinalReport).not.toHaveBeenCalled();
    });

    it("is idempotent when the interview is already completed", async () => {
      const interview = { _id: "interview1", userId: OWNER_ID, status: "completed" };
      Interview.findById.mockResolvedValue(interview);

      const res = await request(app).post("/api/interviews/interview1/complete");
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/already completed/i);
      expect(generateFinalReport).not.toHaveBeenCalled();
    });

    it("generates and stores the final report", async () => {
      const interview = {
        _id: "interview1",
        userId: OWNER_ID,
        status: "in-progress",
        targetRole: "Full Stack Engineer",
        interviewType: "Mixed",
        difficulty: "Medium",
        resumeText: baseBody.resumeText,
        jobDescription: baseBody.jobDescription,
        questions: [{ questionText: "Q1", userAnswer: "An answer" }],
        save: jest.fn().mockResolvedValue(true),
      };
      Interview.findById.mockResolvedValue(interview);
      generateFinalReport.mockResolvedValue({
        overallScore: 82,
        technicalScore: 80,
        communicationScore: 85,
        relevanceScore: 88,
        averageScore: 82,
        strongAreas: ["APIs"],
        weakAreas: ["System design"],
        wellAnsweredQuestions: [],
        needsImprovementQuestions: [],
        missingConcepts: [],
        recommendedTopics: [],
        improvementPlan: [],
      });

      const res = await request(app).post("/api/interviews/interview1/complete");

      expect(res.status).toBe(200);
      expect(interview.status).toBe("completed");
      expect(interview.finalReport.overallScore).toBe(82);
      expect(interview.save).toHaveBeenCalled();
    });
  });

  describe("DELETE /api/interviews/:id", () => {
    it("returns 403 when deleting someone else's interview", async () => {
      Interview.findById.mockResolvedValue({ _id: "interview1", userId: OTHER_USER_ID });
      const res = await request(app).delete("/api/interviews/interview1");
      expect(res.status).toBe(403);
    });

    it("deletes an owned interview", async () => {
      const deleteOne = jest.fn().mockResolvedValue(true);
      Interview.findById.mockResolvedValue({ _id: "interview1", userId: OWNER_ID, deleteOne });
      const res = await request(app).delete("/api/interviews/interview1");
      expect(res.status).toBe(200);
      expect(deleteOne).toHaveBeenCalled();
    });
  });

  describe("GET /api/interviews/stats", () => {
    it("computes averageScore and weakTopics from completed interviews", async () => {
      Interview.countDocuments.mockResolvedValue(4);
      Interview.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([
          {
            finalReport: { overallScore: 90, weakAreas: ["System design"] },
            completedAt: new Date(),
          },
          {
            finalReport: { overallScore: 70, weakAreas: ["SQL"] },
            completedAt: new Date(),
          },
        ]),
      });

      const res = await request(app).get("/api/interviews/stats");

      expect(res.status).toBe(200);
      expect(res.body.stats.totalInterviews).toBe(4);
      expect(res.body.stats.completedInterviews).toBe(2);
      expect(res.body.stats.averageScore).toBe(80);
      expect(res.body.stats.weakTopics).toEqual(expect.arrayContaining(["System design", "SQL"]));
    });
  });
});
