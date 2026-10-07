const { GoogleGenAI } = require("@google/genai");
const logger = require("../utils/logger");

// A hung Gemini call used to be able to hold a request (and its rate-limit
// slot) open indefinitely. These bound every outbound call and retry a
// handful of times on clearly-transient failures before giving up.
const REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 60000;
const MAX_RETRIES = Number(process.env.GEMINI_MAX_RETRIES) || 2;
const BASE_RETRY_DELAY_MS = 500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Races a promise against a hard timeout. `abortController` (optional) is
// aborted on timeout too, so an in-flight fetch is actually cancelled rather
// than just ignored.
const withTimeout = (promise, ms, label, abortController) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      if (abortController) abortController.abort();
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

// Only retry failures that look transient (rate limits, overload, network
// blips) — a bad API key or malformed request will fail the same way every
// time, so retrying it just burns time and quota.
const isRetryable = (error) => {
  const msg = (error?.message || "").toLowerCase();
  return (
    msg.includes("timed out") ||
    msg.includes("429") ||
    msg.includes("503") ||
    msg.includes("500") ||
    msg.includes("rate limit") ||
    msg.includes("overloaded") ||
    msg.includes("econnreset") ||
    msg.includes("econnrefused") ||
    msg.includes("fetch failed") ||
    msg.includes("network")
  );
};

// Exponential backoff: 500ms, 1000ms, 2000ms, ... between attempts.
const withRetry = async (fn, { retries = MAX_RETRIES, label = "Gemini call" } = {}) => {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries || !isRetryable(error)) throw error;
      const delay = BASE_RETRY_DELAY_MS * 2 ** attempt;
      logger.warn(
        { attempt: attempt + 1, retries, delay, err: error.message },
        `${label} failed, retrying`
      );
      await sleep(delay);
    }
  }
  throw lastError;
};

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
    return await withRetry(
      async () => {
        const ai = new GoogleGenAI({ apiKey });

        const response = await withTimeout(
          ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: [
              {
                role: "user",
                parts: [{ text: `${systemInstruction}\n\nUser Question:\n${prompt}` }],
              },
            ],
          }),
          REQUEST_TIMEOUT_MS,
          "Gemini generateContent"
        );

        if (response && response.text) {
          return response.text;
        }

        throw new Error("Empty response returned from Gemini API");
      },
      { label: "Gemini generateContent" }
    );
  } catch (error) {
    logger.error({ err: error.message }, "Gemini API Service Error");

    // Fallback: If the primary model/SDK call keeps failing, attempt a
    // direct REST API call against an older model, also timeout-bounded.
    try {
      const controller = new AbortController();
      const restResponse = await withTimeout(
        fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemInstruction}\n\nUser Question:\n${prompt}` }] }],
            }),
            signal: controller.signal,
          }
        ),
        REQUEST_TIMEOUT_MS,
        "Gemini REST fallback",
        controller
      );

      const data = await restResponse.json();
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }

      if (data.error) {
        throw new Error(data.error.message || "Gemini REST API error");
      }
    } catch (fallbackError) {
      logger.error({ err: fallbackError.message }, "Gemini fallback also failed");
    }

    throw new Error(error.message || "Failed to generate AI response from Gemini");
  }
};

/* ------------------------------------------------------------------ *
 * Interview Preparation / Mock Interview helpers
 * Reuses the same GoogleGenAI client + REST fallback pattern above,
 * but requests structured JSON output instead of free-text Markdown.
 * ------------------------------------------------------------------ */

// Clamp a numeric score to the 0-100 range; defaults to 0 if not a number
const clampScore = (value) => {
  const num = Number(value);
  if (Number.isNaN(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
};

// Extract the first valid JSON value (object or array) from a raw AI text response,
// stripping markdown code fences and any surrounding commentary the model might add.
const extractJSON = (text) => {
  if (!text || typeof text !== "string") {
    throw new Error("Empty response received from Gemini API");
  }

  let cleaned = text.trim();
  cleaned = cleaned.replace(/```json/gi, "```").replace(/```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (_) {
    // Fall back to locating the outermost JSON object/array in the text
  }

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

  if (start === -1) {
    throw new Error("Gemini response did not contain valid JSON");
  }

  const end = isArray ? cleaned.lastIndexOf("]") : cleaned.lastIndexOf("}");
  if (end === -1 || end < start) {
    throw new Error("Gemini response did not contain valid JSON");
  }

  return JSON.parse(cleaned.slice(start, end + 1));
};

// Low-level call to Gemini requesting a JSON-only response, with REST fallback,
// mirroring the resilience pattern used by generateGeminiResponse above.
const callGeminiJSON = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server");
  }

  try {
    return await withRetry(
      async () => {
        const ai = new GoogleGenAI({ apiKey });

        const response = await withTimeout(
          ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json" },
          }),
          REQUEST_TIMEOUT_MS,
          "Gemini generateContent (JSON)"
        );

        if (response && response.text) {
          return response.text;
        }

        throw new Error("Empty response returned from Gemini API");
      },
      { label: "Gemini generateContent (JSON)" }
    );
  } catch (error) {
    logger.error({ err: error.message }, "Gemini JSON Service Error");

    try {
      const controller = new AbortController();
      const restResponse = await withTimeout(
        fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json" },
            }),
            signal: controller.signal,
          }
        ),
        REQUEST_TIMEOUT_MS,
        "Gemini JSON REST fallback",
        controller
      );

      const data = await restResponse.json();
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }

      if (data.error) {
        throw new Error(data.error.message || "Gemini REST API error");
      }
    } catch (fallbackError) {
      logger.error({ err: fallbackError.message }, "Gemini JSON fallback also failed");
    }

    throw new Error(error.message || "Failed to generate structured AI response from Gemini");
  }
};

const VALID_CATEGORIES = ["Technical", "Resume-based", "Project-based", "HR", "Behavioral", "Scenario-based"];

/**
 * Generate a personalized set of interview questions grounded in the candidate's
 * actual resume content and the target job description.
 */
const generateInterviewQuestions = async ({
  resumeText,
  jobDescription,
  targetRole,
  interviewType = "Mixed",
  difficulty = "Medium",
  questionCount = 5,
}) => {
  const categoryGuidance = {
    Technical:
      "Focus mostly on Technical, Resume-based, Project-based, and Scenario-based questions tied directly to the candidate's actual tech stack and projects.",
    HR:
      "Focus mostly on HR and Behavioral questions about teamwork, communication, conflict resolution, ownership, and career motivation.",
    Mixed:
      "Include a balanced mix across all categories: Technical, Resume-based, Project-based, HR, Behavioral, and Scenario-based.",
  };

  const prompt = `You are an expert technical interviewer preparing a personalized interview question set for a real candidate.

CANDIDATE RESUME:
"""
${resumeText}
"""

TARGET JOB DESCRIPTION:
"""
${jobDescription}
"""

TARGET ROLE: ${targetRole || "Not specified - infer the most likely role from the job description"}
INTERVIEW TYPE: ${interviewType}
DIFFICULTY: ${difficulty}
NUMBER OF QUESTIONS REQUIRED: ${questionCount}

INSTRUCTIONS:
- ${categoryGuidance[interviewType] || categoryGuidance.Mixed}
- Base every question on the ACTUAL skills, technologies, and projects mentioned in the resume, and on the requirements stated in the job description.
- Do NOT invent generic questions unrelated to the resume or job description content.
- For example, if the resume mentions specific languages, frameworks, or projects, ask about those specifically instead of generic industry trivia.
- Every question's difficulty must match the requested level: ${difficulty}.
- Each "category" value must be exactly one of: ${VALID_CATEGORIES.join(", ")}.
- For each question, provide a concise model/suggested answer (3-6 sentences) and 3-5 key points a strong answer should cover.

Return ONLY a valid JSON array (no markdown, no code fences, no commentary before or after) with exactly ${questionCount} objects, each shaped exactly as:
{
  "category": "one of: ${VALID_CATEGORIES.join(", ")}",
  "difficulty": "Easy" | "Medium" | "Hard",
  "questionText": "string",
  "suggestedAnswer": "string",
  "keyPoints": ["string", "string", "string"]
}`;

  const raw = await callGeminiJSON(prompt);
  const parsed = extractJSON(raw);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Gemini did not return a valid list of interview questions");
  }

  return parsed.slice(0, questionCount).map((q, idx) => ({
    questionId: `q_${Date.now()}_${idx}`,
    category: VALID_CATEGORIES.includes(q.category) ? q.category : "Technical",
    difficulty: ["Easy", "Medium", "Hard"].includes(q.difficulty) ? q.difficulty : difficulty,
    questionText: (q.questionText || q.question || "").toString().trim(),
    suggestedAnswer: (q.suggestedAnswer || "").toString().trim(),
    keyPoints: Array.isArray(q.keyPoints) ? q.keyPoints.map(String).slice(0, 6) : [],
  })).filter((q) => q.questionText);
};

/**
 * Evaluate a candidate's answer to a single interview question (or follow-up question)
 * using Gemini, grounded in the actual question and answer text.
 */
const evaluateInterviewAnswer = async ({
  questionText,
  category,
  difficulty,
  userAnswer,
  resumeText,
  jobDescription,
  allowFollowUp = true,
}) => {
  const prompt = `You are an expert technical interviewer evaluating a candidate's real interview answer. Be honest and specific - never use placeholder or hardcoded scores; base the evaluation strictly on the actual content of the answer below.

QUESTION (category: ${category}, difficulty: ${difficulty}):
"${questionText}"

CANDIDATE RESUME (context only):
"""
${resumeText}
"""

JOB DESCRIPTION (context only):
"""
${jobDescription}
"""

CANDIDATE'S ANSWER:
"""
${userAnswer}
"""

Evaluate: correctness, relevance to the question, technical depth, completeness, and communication quality.

Return ONLY valid JSON (no markdown, no code fences, no commentary) shaped exactly as:
{
  "score": number (0-100 overall score),
  "correctness": number (0-100),
  "relevance": number (0-100),
  "technicalDepth": number (0-100),
  "completeness": number (0-100),
  "communicationQuality": number (0-100),
  "goodPoints": ["specific things the candidate did well"],
  "missingPoints": ["specific important points that were missing"],
  "improvements": ["specific, actionable suggestions to improve this answer"],
  "sampleAnswer": "a strong improved sample answer, 3-6 sentences"${
    allowFollowUp
      ? `,
  "followUpQuestion": "a short, natural follow-up question that digs deeper into this specific answer, or null if a follow-up is not needed"`
      : ""
  }
}`;

  const raw = await callGeminiJSON(prompt);
  const parsed = extractJSON(raw);

  const followUpRaw = allowFollowUp ? parsed.followUpQuestion : null;
  const followUpQuestion =
    followUpRaw && typeof followUpRaw === "string" && followUpRaw.trim().toLowerCase() !== "null"
      ? followUpRaw.trim()
      : null;

  return {
    score: clampScore(parsed.score),
    correctness: clampScore(parsed.correctness),
    relevance: clampScore(parsed.relevance),
    technicalDepth: clampScore(parsed.technicalDepth),
    completeness: clampScore(parsed.completeness),
    communicationQuality: clampScore(parsed.communicationQuality),
    goodPoints: Array.isArray(parsed.goodPoints) ? parsed.goodPoints.map(String).slice(0, 6) : [],
    missingPoints: Array.isArray(parsed.missingPoints) ? parsed.missingPoints.map(String).slice(0, 6) : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements.map(String).slice(0, 6) : [],
    sampleAnswer: (parsed.sampleAnswer || "").toString().trim(),
    followUpQuestion,
  };
};

/**
 * Generate a comprehensive final performance report for a completed mock interview,
 * grounded in the actual questions, answers, follow-ups, and per-question scores.
 */
const generateFinalReport = async ({ targetRole, interviewType, difficulty, questions, resumeText, jobDescription }) => {
  const qaSummary = questions
    .map((q, i) => {
      const followUpText = (q.followUps || [])
        .map(
          (f) =>
            `  Follow-up Question: ${f.questionText}\n  Follow-up Answer: ${f.userAnswer || "(not answered)"}\n  Follow-up Score: ${
              f.evaluation?.score ?? "N/A"
            }`
        )
        .join("\n");

      return `Q${i + 1} [${q.category} / ${q.difficulty}]: ${q.questionText}
Candidate Answer: ${q.userAnswer || "(not answered)"}
Score: ${q.evaluation?.score ?? "N/A"}
Good Points: ${(q.evaluation?.goodPoints || []).join("; ") || "N/A"}
Missing Points: ${(q.evaluation?.missingPoints || []).join("; ") || "N/A"}
${followUpText}`;
    })
    .join("\n\n");

  const prompt = `You are an expert interview coach producing a final performance report for a completed mock interview. Base every conclusion strictly on the actual transcript and scores below - do not use placeholder or hardcoded values.

TARGET ROLE: ${targetRole || "Not specified"}
INTERVIEW TYPE: ${interviewType}
DIFFICULTY: ${difficulty}

FULL INTERVIEW TRANSCRIPT WITH SCORES:
${qaSummary}

Return ONLY valid JSON (no markdown, no code fences, no commentary) shaped exactly as:
{
  "overallScore": number (0-100),
  "technicalScore": number (0-100),
  "communicationScore": number (0-100),
  "relevanceScore": number (0-100),
  "averageScore": number (0-100, average of all individual question scores),
  "strongAreas": ["specific topics/skills the candidate performed well in"],
  "weakAreas": ["specific topics/skills that need work"],
  "wellAnsweredQuestions": ["short references to well-answered questions, e.g. 'Q1: REST API design'"],
  "needsImprovementQuestions": ["short references to weak questions, e.g. 'Q3: SQL optimization'"],
  "missingConcepts": ["specific concepts/technologies the candidate should learn or revise"],
  "recommendedTopics": ["specific, actionable study recommendations"],
  "improvementPlan": ["3-5 concrete personalized next steps"]
}`;

  const raw = await callGeminiJSON(prompt);
  const parsed = extractJSON(raw);

  return {
    overallScore: clampScore(parsed.overallScore),
    technicalScore: clampScore(parsed.technicalScore),
    communicationScore: clampScore(parsed.communicationScore),
    relevanceScore: clampScore(parsed.relevanceScore),
    averageScore: clampScore(parsed.averageScore),
    strongAreas: Array.isArray(parsed.strongAreas) ? parsed.strongAreas.map(String).slice(0, 8) : [],
    weakAreas: Array.isArray(parsed.weakAreas) ? parsed.weakAreas.map(String).slice(0, 8) : [],
    wellAnsweredQuestions: Array.isArray(parsed.wellAnsweredQuestions)
      ? parsed.wellAnsweredQuestions.map(String).slice(0, 10)
      : [],
    needsImprovementQuestions: Array.isArray(parsed.needsImprovementQuestions)
      ? parsed.needsImprovementQuestions.map(String).slice(0, 10)
      : [],
    missingConcepts: Array.isArray(parsed.missingConcepts) ? parsed.missingConcepts.map(String).slice(0, 8) : [],
    recommendedTopics: Array.isArray(parsed.recommendedTopics) ? parsed.recommendedTopics.map(String).slice(0, 8) : [],
    improvementPlan: Array.isArray(parsed.improvementPlan) ? parsed.improvementPlan.map(String).slice(0, 6) : [],
  };
};

module.exports = {
  generateGeminiResponse,
  generateInterviewQuestions,
  evaluateInterviewAnswer,
  generateFinalReport,
};
