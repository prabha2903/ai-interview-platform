const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config(); // Fallback to current working directory

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const pinoHttp = require("pino-http");
const mongoose = require("mongoose");

const logger = require("./utils/logger");
const validateEnv = require("./utils/validateEnv");
const sanitizeRequest = require("./middleware/sanitizeRequest");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const { generalLimiter } = require("./middleware/rateLimiter");

// Import Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const aiRoutes = require("./routes/aiRoutes");
const historyRoutes = require("./routes/historyRoutes");
const interviewRoutes = require("./routes/interviewRoutes");

// Fail fast on missing/insecure config rather than starting in a broken or
// insecure state (e.g. a missing JWT_SECRET used to be silently undefined).
if (process.env.NODE_ENV !== "test") {
  validateEnv();
}

const app = express();

// Trust the first proxy hop (needed behind nginx/a load balancer) so
// req.ip and secure-cookie detection reflect the real client, not the proxy.
app.set("trust proxy", 1);

// --- Security & platform middleware ---
app.use(helmet());
app.use(compression());

// CORS: locked down to an explicit allowlist in production. In development,
// falls back to allowing the local Vite dev server(s).
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (curl, server-to-server, health checks)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true, // required so the browser sends/receives the httpOnly auth cookies
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use(sanitizeRequest); // Strip any keys starting with $ or containing . from user input (NoSQL injection guard)

if (process.env.NODE_ENV !== "test") {
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === "/healthz" || req.url === "/readyz" },
    })
  );
}

// General rate limit across the whole API surface (specific routes add stricter limits)
app.use("/api", generalLimiter);

// Liveness probe: process is up and able to respond. Used by Docker/k8s to
// decide whether to restart the container — deliberately doesn't touch the DB.
app.get("/healthz", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Readiness probe: process is up AND its dependencies (DB) are reachable.
// Used to decide whether to route traffic to this instance.
app.get("/readyz", (req, res) => {
  const dbReady = mongoose.connection.readyState === 1; // 1 = connected
  res.status(dbReady ? 200 : 503).json({
    status: dbReady ? "ready" : "not_ready",
    db: mongoose.STATES[mongoose.connection.readyState],
  });
});

// Root status endpoint (kept for backwards compatibility with existing docs/links)
app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "AI-Powered MERN Application Backend API is active",
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      ai: "/api/ai",
      history: "/api/history",
      interviews: "/api/interviews",
    },
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/interviews", interviewRoutes);

// 404 Route Handler
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

// Global Error Handler Middleware
app.use(errorHandler);

// Only connect to MongoDB and start listening when this file is run
// directly (`node server.js`), not when it's imported by the test suite.
if (require.main === module) {
  connectDB();

  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    logger.info(`Backend server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
  });

  // Graceful shutdown: stop accepting new connections, let in-flight
  // requests finish, close the DB connection, then exit. Without this, a
  // deploy/restart (SIGTERM from Docker/k8s) kills requests mid-flight and
  // can leave the Mongo connection in a bad state.
  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    server.close(async () => {
      logger.info("HTTP server closed");
      try {
        await mongoose.connection.close(false);
        logger.info("MongoDB connection closed");
      } catch (err) {
        logger.error({ err }, "Error closing MongoDB connection");
      } finally {
        process.exit(0);
      }
    });

    // Force-exit if graceful shutdown hangs (e.g. a stuck request)
    setTimeout(() => {
      logger.error("Graceful shutdown timed out, forcing exit");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    logger.error({ err: reason }, "Unhandled promise rejection");
  });
  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "Uncaught exception, exiting");
    process.exit(1);
  });
}

module.exports = app;
