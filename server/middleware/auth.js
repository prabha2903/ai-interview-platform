const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    // Primary path: httpOnly cookie set by login/register/refresh. We also
    // accept a Bearer header as a fallback so non-browser API clients
    // (scripts, mobile, tests) that can't hold cookies still work.
    let token = req.cookies?.accessToken;

    if (!token && req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      res.status(401);
      throw new Error("Not authorized, no token provided");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password +tokenVersion");

    if (!user) {
      res.status(401);
      throw new Error("User account no longer exists");
    }

    // A version mismatch means this token was issued before a password
    // reset / "log out everywhere" — reject it even though it hasn't
    // technically expired yet.
    if ((decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
      res.status(401);
      throw new Error("Session has been revoked, please log in again");
    }

    req.user = user;
    return next();
  } catch (error) {
    res.status(401);
    const message =
      error.name === "TokenExpiredError"
        ? "Session expired, please log in again"
        : error.message || "Not authorized, invalid token";
    return next(new Error(message));
  }
};

module.exports = { protect };
