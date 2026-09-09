const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        try {
            token = req.headers.authorization.split(" ")[1];

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

            req.user = await User.findById(decoded.id).select("-password");

            if (!req.user) {
                res.status(401);
                return next(new Error("User account no longer exists"));
            }

            return next();

        } catch (error) {
            console.error("Auth Middleware Error:", error.message);

            res.status(401);

            const message =
                error.name === "TokenExpiredError"
                    ? "Session expired, please login again"
                    : "Not authorized, invalid token";

            return next(new Error(message));
        }
    }

    if (!token) {
        res.status(401);
        return next(new Error("Not authorized, no token provided"));
    }
};

module.exports = { protect };