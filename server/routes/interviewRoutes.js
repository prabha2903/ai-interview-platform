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
const { protect } = require("../middleware/auth");

router.use(protect);

// NOTE: /stats must be registered before the /:id route so "stats" is never
// captured as an interview id.
router.get("/stats", getInterviewStats);

router.post("/", createInterview);
router.get("/", getInterviews);
router.get("/:id", getInterview);
router.post("/:id/answer", submitAnswer);
router.post("/:id/complete", completeInterview);
router.delete("/:id", deleteInterview);

module.exports = router;
