const mongoose = require("mongoose");

// Shared evaluation shape reused for both main-question and follow-up-question answers
const evaluationSchema = new mongoose.Schema(
  {
    score: { type: Number, min: 0, max: 100 },
    correctness: { type: Number, min: 0, max: 100 },
    relevance: { type: Number, min: 0, max: 100 },
    technicalDepth: { type: Number, min: 0, max: 100 },
    completeness: { type: Number, min: 0, max: 100 },
    communicationQuality: { type: Number, min: 0, max: 100 },
    goodPoints: [{ type: String }],
    missingPoints: [{ type: String }],
    improvements: [{ type: String }],
    sampleAnswer: { type: String, default: "" },
  },
  { _id: false }
);

const followUpSchema = new mongoose.Schema(
  {
    questionText: { type: String, required: true },
    userAnswer: { type: String, default: null },
    answeredAt: { type: Date, default: null },
    evaluation: { type: evaluationSchema, default: null },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    category: {
      type: String,
      enum: ["Technical", "Resume-based", "Project-based", "HR", "Behavioral", "Scenario-based"],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      required: true,
    },
    questionText: { type: String, required: true },
    suggestedAnswer: { type: String, default: "" },
    keyPoints: [{ type: String }],
    userAnswer: { type: String, default: null },
    answeredAt: { type: Date, default: null },
    evaluation: { type: evaluationSchema, default: null },
    followUps: { type: [followUpSchema], default: [] },
  },
  { _id: false }
);

const finalReportSchema = new mongoose.Schema(
  {
    overallScore: { type: Number, min: 0, max: 100 },
    technicalScore: { type: Number, min: 0, max: 100 },
    communicationScore: { type: Number, min: 0, max: 100 },
    relevanceScore: { type: Number, min: 0, max: 100 },
    averageScore: { type: Number, min: 0, max: 100 },
    strongAreas: [{ type: String }],
    weakAreas: [{ type: String }],
    wellAnsweredQuestions: [{ type: String }],
    needsImprovementQuestions: [{ type: String }],
    missingConcepts: [{ type: String }],
    recommendedTopics: [{ type: String }],
    improvementPlan: [{ type: String }],
  },
  { _id: false }
);

const interviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetRole: { type: String, default: "", trim: true },
    resumeText: { type: String, required: [true, "Resume text is required"] },
    jobDescription: { type: String, required: [true, "Job description is required"] },
    interviewType: {
      type: String,
      enum: ["Technical", "HR", "Mixed"],
      default: "Mixed",
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    questionCount: { type: Number, default: 5 },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed"],
      default: "pending",
    },
    currentQuestionIndex: { type: Number, default: 0 },
    questions: { type: [questionSchema], default: [] },
    finalReport: { type: finalReportSchema, default: null },
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// Fast lookups for a user's interview list, most recent first
interviewSchema.index({ userId: 1, createdAt: -1 });

const Interview = mongoose.model("Interview", interviewSchema);

module.exports = Interview;
