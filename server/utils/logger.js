const pino = require("pino");

// Structured JSON logs in production (easy to ship to a log aggregator),
// human-readable pretty output in development/test. A single shared logger
// instance is used everywhere instead of console.log so log level, timestamps
// and request IDs stay consistent across the app.
const isProd = process.env.NODE_ENV === "production";

const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
  transport: isProd
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" },
      },
});

module.exports = logger;
