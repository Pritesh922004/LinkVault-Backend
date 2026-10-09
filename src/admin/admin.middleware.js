import jwt from "jsonwebtoken";

export const AdminAuth = async (req, res, next) => {
    try {
        // ONLY accept the AdminAccess cookie or a Bearer token — NOT the regular user Access cookie
        const token =
            req.cookies?.AdminAccess ||
            req.headers?.authorization?.replace(/^Bearer\s+/i, "");

        if (!token) {
            return res.status(401).json({
                success: false,
                statusCode: 401,
                error: "Unauthorized",
                message: "Admin authentication required. No token provided."
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded || decoded.role !== "admin") {
            return res.status(403).json({
                success: false,
                statusCode: 403,
                error: "Forbidden",
                message: "Access restricted to administrators only."
            });
        }

        req.admin = decoded;
        next();
    } catch (error) {
        console.error("AdminAuth Middleware Error:", error?.message);
        return res.status(401).json({
            success: false,
            statusCode: 401,
            error: "Unauthorized",
            message: "Invalid or expired admin session token."
        });
    }
};
