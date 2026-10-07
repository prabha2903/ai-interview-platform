const express = require("express");
const router = express.Router();
const { generateAI } = require("../controllers/aiController");
const { protect } = require("../middleware/auth");
const { aiLimiter } = require("../middleware/rateLimiter");
const { aiGenerateValidation } = require("../middleware/validators");

router.post("/generate", protect, aiLimiter, aiGenerateValidation, generateAI);

module.exports = router;
