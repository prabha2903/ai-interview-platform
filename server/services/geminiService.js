const { GoogleGenAI } = require("@google/genai");

/**
 * Service to interact securely with Google Gemini API on backend
 * @param {string} prompt - User prompt
 * @param {string} category - Prompt category (optional)
 * @returns {Promise<string>} - Generated AI response text
 */
const generateGeminiResponse = async (prompt, category = "General") => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server");
  }

  const systemInstruction = `You are an elite AI Career & Technical Interview Assistant powered by Google Gemini.
Your role is to help candidates excel in software development, tech interviews, code reviews, system design, and career growth.
Category: ${category}
Provide clear, structured, highly professional, accurate, and actionable answers.
Use proper Markdown formatting (headers, code blocks, bullet points) in your response.`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Fixed: Migrated directly to the active stable Gemini 3 flagship model
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { systemInstruction }
    });

    if (response && response.text) return response.text;
    throw new Error("Empty response returned from Gemini API");
  } catch (error) {
    console.error("Gemini API Service Error:", error.message || error);
    throw new Error(error.message || "Failed to generate AI response from Gemini");
  }
};

const clampScore = (value) => {
  const num = Number(value);
  if (Number.isNaN(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
};

const extractJSON = (text) => {
  if (!text || typeof text !== "string") {
    throw new Error("Empty response received from Gemini API");
  }
  let cleaned = text.trim();
  cleaned = cleaned.replace(/```json/gi, "```").replace(/```/g, "").trim();

  const firstObj = cleaned.indexOf("{");
  const firstArr = cleaned.indexOf("[");
  let start = -1;
  let isArray = false;

  if (firstArr !== -1 && (firstObj === -1 || firstArr < firstObj)) {
    start = firstArr;
    isArray = true;
  } else if (firstObj !== -1) {
    start = firstObj;
  }

  if (start === -1) throw new Error("Gemini response did not contain valid JSON");
  const end = isArray ? cleaned.lastIndexOf("]") : cleaned.lastIndexOf("}");
  if (end === -1 || end < start) throw new Error("Gemini response did not contain valid JSON");

  return JSON.parse(cleaned.slice(start, end + 1));
};

const callGeminiJSON = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured on the server");

  try {
    const ai = new GoogleGenAI({ apiKey });
    // Fixed: Migrated JSON engine to gemini-3.6-flash
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });

    if (response && response.text) return response.text;
    throw new Error("Empty response returned from Gemini API");
  } catch (error) {
    console.error("Gemini JSON Service Error:", error.message || error);
    throw new Error(error.message || "Failed to generate structured AI response from Gemini");
  }
};

const VALID_CATEGORIES = ["Technical", "Resume-based", "Project-based", "HR", "Behavioral", "Scenario-based"];

/**
 * Generate personalized interview questions matching Mongoose schema arrays exactly
 */
const generateInterviewQuestions = async ({
  resumeText = "",
  jobDescription = "",
  targetRole = "Not specified",
  interviewType = "Mixed",
  difficulty = "Medium",
  questionCount = 5,
}) => {
  const categoryGuidance = {
    Technical: "Focus mostly on Technical, Resume-based, Project-based, and Scenario-based questions.",
    HR: "Focus mostly on HR and Behavioral questions.",
    Mixed: "Include a balanced mix across all categories.",
  };

  // Fixed structural parameters inside the prompt schema structure to match Mongoose schema definitions
  const prompt = `You are an expert technical interviewer preparing a personalized interview question set.

CANDIDATE RESUME:
"""
${resumeText}
"""

TARGET JOB DESCRIPTION:
"""
${jobDescription}
"""

TARGET ROLE: ${targetRole}
INTERVIEW TYPE: ${interviewType}
DIFFICULTY: ${difficulty}
NUMBER OF QUESTIONS REQUIRED: ${questionCount}

INSTRUCTIONS:
- ${categoryGuidance[interviewType] || categoryGuidance.Mixed}
- Base every question on the ACTUAL skills mentioned in the resume.
- Every single question object must explicitly contain the difficulty parameter: "${difficulty}".
- Each "category" value must be exactly one of: ${VALID_CATEGORIES.join(", ")}.

Return a valid JSON array of objects with exactly this schema structure matching your backend controllers:
[
  {
    "questionId": "1",
    "category": "Technical",
    "difficulty": "${difficulty}",
    "questionText": "The question string...",
    "suggestedAnswer": "The suggested answer string..."
  }
]`;

  const rawJsonText = await callGeminiJSON(prompt);
  return extractJSON(rawJsonText);
};

module.exports = {
  generateGeminiResponse,
  generateInterviewQuestions,
  clampScore
};
