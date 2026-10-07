const logger = require("./logger");

// Config that must be present for the app to run safely. Missing any of
// these used to silently fall back to insecure defaults (or crash deep
// inside a request handler) — instead we refuse to start at all and say
// exactly what's missing.
const REQUIRED_IN_ALL_ENVS = ["MONGODB_URI", "JWT_SECRET"];

// GEMINI_API_KEY is required to actually serve AI features, but we don't
// hard-fail on it so the rest of the app (auth, profile, etc.) can still run
// in an environment where it hasn't been provisioned yet.
const RECOMMENDED = ["GEMINI_API_KEY"];

const validateEnv = () => {
  const missing = REQUIRED_IN_ALL_ENVS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.fatal(
      { missing },
      `Missing required environment variable(s): ${missing.join(", ")}. Refusing to start.`
    );
    process.exit(1);
  }

  if (process.env.NODE_ENV === "production" && process.env.JWT_SECRET.length < 32) {
    logger.fatal("JWT_SECRET is too short for production use (minimum 32 characters). Refusing to start.");
    process.exit(1);
  }

  const missingRecommended = RECOMMENDED.filter((key) => !process.env[key]);
  if (missingRecommended.length > 0) {
    logger.warn(
      { missingRecommended },
      `Optional environment variable(s) not set: ${missingRecommended.join(", ")}. Related features will be unavailable.`
    );
  }
};

module.exports = validateEnv;
