const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message || "Internal Server Error";

    // Mongoose bad ObjectId
    if (err.name === "CastError") {
        message = `Resource not found with id of ${err.value}`;
        statusCode = 404;
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || "field";
        message = `An account with that ${field} already exists`;
        statusCode = 400;
    }

    // Mongoose validation error
    if (err.name === "ValidationError") {
        message = Object.values(err.errors)
            .map((val) => val.message)
            .join(", ");
        statusCode = 400;
    }

    // Log every error centrally (with request context) so nothing gets lost
    // to an uncaptured console.error in an individual controller. 5xx errors
    // are logged at "error" level (paging/alerting-worthy); 4xx are "warn"
    // since they're usually expected client mistakes, not bugs.
    const logPayload = { err, method: req.method, path: req.originalUrl, statusCode };
    if (statusCode >= 500) {
        logger.error(logPayload, message);
    } else {
        logger.warn(logPayload, message);
    }

    res.status(statusCode).json({
        success: false,
        message,
        stack: process.env.NODE_ENV === "production" ? null : err.stack,
    });
};

module.exports = errorHandler;