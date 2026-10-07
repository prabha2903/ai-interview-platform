const express = require("express");
const router = express.Router();
const {
  createInterview,
  getInterviews,
  getInterview,
  submitAnswer,
  completeInterview,
  deleteInterview,
  getInterviewStats,
} = require("../controllers/interviewController");
const { parseResume } = require("../controllers/resumeController");
const { protect } = require("../middleware/auth");
const { aiLimiter } = require("../middleware/rateLimiter");
const uploadResume = require("../middleware/uploadResume");
const {
  createInterviewValidation,
  submitAnswerValidation,
} = require("../middleware/validators");

router.use(protect);

// NOTE: /stats must be registered before the /:id route so "stats" is never
// captured as an interview id.
router.get("/stats", getInterviewStats);

// Resume file upload -> extracted text (used to prefill resumeText on the client)
router.post(
  "/parse-resume",
  aiLimiter,
  (req, res, next) => {
    uploadResume.single("resume")(req, res, (err) => {
      if (err) {
        res.status(400);
        return next(new Error(err.message || "Failed to upload resume file"));
      }
      next();
    });
  },
  parseResume
);

router.post("/", aiLimiter, createInterviewValidation, createInterview);
router.get("/", getInterviews);
router.get("/:id", getInterview);
router.post("/:id/answer", aiLimiter, submitAnswerValidation, submitAnswer);
router.post("/:id/complete", aiLimiter, completeInterview);
router.delete("/:id", deleteInterview);

module.exports = router;
