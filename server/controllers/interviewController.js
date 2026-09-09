const Interview = require("../models/Interview");
const {
  generateInterviewQuestions,
  evaluateInterviewAnswer,
  generateFinalReport,
} = require("../services/geminiService");

const VALID_TYPES = ["Technical", "HR", "Mixed"];
const VALID_DIFFICULTIES = ["Easy", "Medium", "Hard"];
const VALID_COUNTS = [5, 10, 15];

// Helper: fetch an interview and verify the requesting user owns it
const findOwnedInterview = async (id, userId) => {
  const interview = await Interview.findById(id);
  if (!interview) {
    const error = new Error("Interview not found");
    error.statusCode = 404;
    throw error;
  }
  if (interview.userId.toString() !== userId.toString()) {
    const error = new Error("Unauthorized to access this interview");
    error.statusCode = 403;
    throw error;
  }
  return interview;
};

// @desc    Create a new interview prep session (generates personalized questions)
// @route   POST /api/interviews
// @access  Private
const createInterview = async (req, res, next) => {
  try {
    const {
      resumeText,
      jobDescription,
      targetRole,
      interviewType = "Mixed",
      difficulty = "Medium",
      questionCount = 5,
    } = req.body;

    if (!resumeText || !resumeText.trim()) {
      res.status(400);
      throw new Error("Resume text is required");
    }

    if (!jobDescription || !jobDescription.trim()) {
      res.status(400);
      throw new Error("Job description is required");
    }

    if (!VALID_TYPES.includes(interviewType)) {
      res.status(400);
      throw new Error(`Interview type must be one of: ${VALID_TYPES.join(", ")}`);
    }

    if (!VALID_DIFFICULTIES.includes(difficulty)) {
      res.status(400);
      throw new Error(`Difficulty must be one of: ${VALID_DIFFICULTIES.join(", ")}`);
    }

    const count = parseInt(questionCount, 10);
    if (!VALID_COUNTS.includes(count)) {
      res.status(400);
      throw new Error(`Question count must be one of: ${VALID_COUNTS.join(", ")}`);
    }

    const questions = await generateInterviewQuestions({
      resumeText: resumeText.trim(),
      jobDescription: jobDescription.trim(),
      targetRole: targetRole?.trim(),
      interviewType,
      difficulty,
      questionCount: count,
    });

    if (!questions.length) {
      res.status(502);
      throw new Error("Failed to generate interview questions. Please try again.");
    }

    const interview = await Interview.create({
      userId: req.user.id,
      targetRole: targetRole?.trim() || "",
      resumeText: resumeText.trim(),
      jobDescription: jobDescription.trim(),
      interviewType,
      difficulty,
      questionCount: questions.length,
      questions,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Interview questions generated successfully",
      interview,
    });
  } catch (error) {
    console.error("Create Interview Error:", error.message);
    next(error);
  }
};

// @desc    Get all interview sessions for the current user (summary fields)
// @route   GET /api/interviews
// @access  Private
const getInterviews = async (req, res, next) => {
  try {
    const interviews = await Interview.find({ userId: req.user.id })
      .select(
        "targetRole interviewType difficulty questionCount status currentQuestionIndex finalReport.overallScore createdAt completedAt"
      )
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: interviews.length,
      interviews,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single interview session in full detail
// @route   GET /api/interviews/:id
// @access  Private
const getInterview = async (req, res, next) => {
  try {
    const interview = await findOwnedInterview(req.params.id, req.user.id);
    res.json({ success: true, interview });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

// @desc    Submit an answer for the current question (or a pending follow-up)
//          and receive an AI evaluation, possibly with a follow-up question.
// @route   POST /api/interviews/:id/answer
// @access  Private
const submitAnswer = async (req, res, next) => {
  try {
    const { answer } = req.body;

    if (!answer || !answer.trim()) {
      res.status(400);
      throw new Error("Answer text is required");
    }

    const interview = await findOwnedInterview(req.params.id, req.user.id);

    if (interview.status === "completed") {
      res.status(400);
      throw new Error("This interview has already been completed");
    }

    if (interview.currentQuestionIndex >= interview.questions.length) {
      res.status(400);
      throw new Error("No more questions remaining in this interview");
    }

    const question = interview.questions[interview.currentQuestionIndex];
    const trimmedAnswer = answer.trim();

    // A pending follow-up is one that's been asked but not yet answered
    const pendingFollowUp = question.followUps.find((f) => !f.userAnswer);

    if (pendingFollowUp) {
      const evaluation = await evaluateInterviewAnswer({
        questionText: pendingFollowUp.questionText,
        category: question.category,
        difficulty: question.difficulty,
        userAnswer: trimmedAnswer,
        resumeText: interview.resumeText,
        jobDescription: interview.jobDescription,
        allowFollowUp: false,
      });

      pendingFollowUp.userAnswer = trimmedAnswer;
      pendingFollowUp.answeredAt = new Date();
      pendingFollowUp.evaluation = evaluation;

      interview.currentQuestionIndex += 1;
      interview.status = "in-progress";
      await interview.save();

      return res.json({
        success: true,
        type: "followUpEvaluated",
        evaluation,
        isLastQuestion: interview.currentQuestionIndex >= interview.questions.length,
        nextQuestionIndex: interview.currentQuestionIndex,
        interview,
      });
    }

    // Answering the main question for this turn
    const evaluation = await evaluateInterviewAnswer({
      questionText: question.questionText,
      category: question.category,
      difficulty: question.difficulty,
      userAnswer: trimmedAnswer,
      resumeText: interview.resumeText,
      jobDescription: interview.jobDescription,
      allowFollowUp: true,
    });

    question.userAnswer = trimmedAnswer;
    question.answeredAt = new Date();
    question.evaluation = evaluation;
    interview.status = "in-progress";

    const payload = {
      success: true,
      type: "answerEvaluated",
      evaluation,
    };

    if (evaluation.followUpQuestion) {
      question.followUps.push({
        questionText: evaluation.followUpQuestion,
        userAnswer: null,
        evaluation: null,
      });
      payload.awaitingFollowUp = true;
      payload.followUpQuestion = evaluation.followUpQuestion;
    } else {
      interview.currentQuestionIndex += 1;
      payload.nextQuestionIndex = interview.currentQuestionIndex;
      payload.isLastQuestion = interview.currentQuestionIndex >= interview.questions.length;
    }

    await interview.save();
    payload.interview = interview;

    res.json(payload);
  } catch (error) {
    console.error("Submit Answer Error:", error.message);
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

// @desc    Complete the interview and generate the final AI performance report
// @route   POST /api/interviews/:id/complete
// @access  Private
const completeInterview = async (req, res, next) => {
  try {
    const interview = await findOwnedInterview(req.params.id, req.user.id);

    if (interview.status === "completed") {
      return res.json({
        success: true,
        message: "Interview already completed",
        interview,
      });
    }

    const answeredCount = interview.questions.filter((q) => q.userAnswer).length;
    if (answeredCount === 0) {
      res.status(400);
      throw new Error("Answer at least one question before completing the interview");
    }

    const finalReport = await generateFinalReport({
      targetRole: interview.targetRole,
      interviewType: interview.interviewType,
      difficulty: interview.difficulty,
      questions: interview.questions,
      resumeText: interview.resumeText,
      jobDescription: interview.jobDescription,
    });

    interview.finalReport = finalReport;
    interview.status = "completed";
    interview.completedAt = new Date();
    await interview.save();

    res.json({
      success: true,
      message: "Interview completed and report generated successfully",
      interview,
    });
  } catch (error) {
    console.error("Complete Interview Error:", error.message);
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

// @desc    Delete an interview session
// @route   DELETE /api/interviews/:id
// @access  Private
const deleteInterview = async (req, res, next) => {
  try {
    const interview = await findOwnedInterview(req.params.id, req.user.id);
    await interview.deleteOne();

    res.json({
      success: true,
      message: "Interview deleted successfully",
      id: req.params.id,
    });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

// @desc    Get aggregated interview stats for the dashboard
// @route   GET /api/interviews/stats
// @access  Private
const getInterviewStats = async (req, res, next) => {
  try {
    const totalInterviews = await Interview.countDocuments({ userId: req.user.id });

    const completed = await Interview.find({ userId: req.user.id, status: "completed" })
      .select("targetRole interviewType difficulty finalReport createdAt completedAt")
      .sort({ completedAt: -1 });

    const completedCount = completed.length;
    const averageScore = completedCount
      ? Math.round(
          completed.reduce((sum, i) => sum + (i.finalReport?.overallScore || 0), 0) / completedCount
        )
      : 0;

    const latestInterview = completed[0] || null;

    const weakTopicsSet = new Set();
    completed.slice(0, 5).forEach((i) => {
      (i.finalReport?.weakAreas || []).forEach((topic) => weakTopicsSet.add(topic));
    });

    res.json({
      success: true,
      stats: {
        totalInterviews,
        completedInterviews: completedCount,
        averageScore,
        latestScore: latestInterview?.finalReport?.overallScore ?? null,
        latestInterview,
        weakTopics: Array.from(weakTopicsSet).slice(0, 5),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createInterview,
  getInterviews,
  getInterview,
  submitAnswer,
  completeInterview,
  deleteInterview,
  getInterviewStats,
};
