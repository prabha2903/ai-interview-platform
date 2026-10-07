const { generateGeminiResponse } = require("../services/geminiService");
const AIHistory = require("../models/AIHistory");

// @desc    Generate response using Gemini API & save to history
// @route   POST /api/ai/generate
// @access  Private
const generateAI = async (req, res, next) => {
  try {
    const { prompt, category } = req.body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      res.status(400);
      throw new Error("Prompt text is required and cannot be empty");
    }

    const trimmedPrompt = prompt.trim();
    const selectedCategory = category || "General";

    // Generate response securely using backend Gemini service
    const responseText = await generateGeminiResponse(trimmedPrompt, selectedCategory);

    // Persist interaction in database
    const historyItem = await AIHistory.create({
      userId: req.user.id,
      prompt: trimmedPrompt,
      response: responseText,
      category: selectedCategory,
    });

    res.status(200).json({
      success: true,
      message: "AI response generated successfully",
      response: responseText,
      historyItem,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateAI,
};
