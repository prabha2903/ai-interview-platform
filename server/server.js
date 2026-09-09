const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config(); // Fallback to current working directory

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");

// Import Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const aiRoutes = require("./routes/aiRoutes");
const historyRoutes = require("./routes/historyRoutes");
const interviewRoutes = require("./routes/interviewRoutes");

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health / Status Endpoint
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
      interviews: "/api/interviews"
    }
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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Backend Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
});