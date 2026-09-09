const mongoose = require("mongoose");

const aiHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    prompt: {
      type: String,
      required: [true, "Prompt is required"],
      trim: true,
    },
    response: {
      type: String,
      required: [true, "Response is required"],
    },
    category: {
      type: String,
      default: "General",
      enum: ["General", "Interview Prep", "Code Review", "Technical Q&A", "Career Advice", "System Design"],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast history queries by user and creation date
aiHistorySchema.index({ userId: 1, createdAt: -1 });

const AIHistory = mongoose.model("AIHistory", aiHistorySchema);

module.exports = AIHistory;
