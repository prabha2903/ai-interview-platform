const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Fail fast on an unreachable/misconfigured DB instead of the 30s
      // Mongoose default — that default also meant a graceful shutdown
      // could hang for up to 30s waiting on a connection attempt that was
      // never going to succeed.
      serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS) || 5000,
    });
    logger.info(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    logger.fatal({ err: error }, `MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
