const { body, validationResult } = require("express-validator");

// Runs after a validation chain; converts express-validator errors into the
// same { success, message } shape the rest of the API uses.
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    const message = errors
      .array()
      .map((e) => e.msg)
      .join(", ");
    return next(new Error(message));
  }
  next();
};

const registerValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("email").trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  validate,
];

const loginValidation = [
  body("email").trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
  validate,
];

const updateProfileValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("email").optional().trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("currentPassword")
    .if(body("newPassword").exists({ checkFalsy: true }))
    .notEmpty()
    .withMessage("Current password is required to set a new password"),
  body("newPassword")
    .optional({ checkFalsy: true })
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long"),
  validate,
];

const forgotPasswordValidation = [
  body("email").trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
  validate,
];

const resetPasswordValidation = [
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  validate,
];

const aiGenerateValidation = [
  body("prompt")
    .trim()
    .notEmpty()
    .withMessage("Prompt is required")
    .isLength({ max: 4000 })
    .withMessage("Prompt must be under 4000 characters"),
  body("category").optional().trim().isLength({ max: 60 }),
  validate,
];

const createInterviewValidation = [
  body("resumeText")
    .trim()
    .notEmpty()
    .withMessage("Resume text is required")
    .isLength({ max: 20000 })
    .withMessage("Resume text is too long"),
  body("jobDescription")
    .trim()
    .notEmpty()
    .withMessage("Job description is required")
    .isLength({ max: 10000 })
    .withMessage("Job description is too long"),
  body("targetRole").optional().trim().isLength({ max: 120 }),
  body("interviewType").optional().isIn(["Technical", "HR", "Mixed"]),
  body("difficulty").optional().isIn(["Easy", "Medium", "Hard"]),
  body("questionCount").optional().isIn([5, 10, 15, "5", "10", "15"]),
  validate,
];

const submitAnswerValidation = [
  body("answer")
    .trim()
    .notEmpty()
    .withMessage("Answer text is required")
    .isLength({ max: 8000 })
    .withMessage("Answer is too long"),
  validate,
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  updateProfileValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  aiGenerateValidation,
  createInterviewValidation,
  submitAnswerValidation,
};
