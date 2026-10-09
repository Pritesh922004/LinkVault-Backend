import { VerifyToken } from "../service/User.service.js";
import { verifyBlockedToken } from "../service/token.service.js";

export const CheckUserId = async (req, res, next) => {
    try {
        const token = req.cookies?.Access || req.headers?.authorization?.replace(/^Bearer\s+/i, '');
        if (!token) return next();
        const isBlocked = await verifyBlockedToken(token);
        if (isBlocked) return next();
        const user = await VerifyToken(token);
        if (!user) return next();
        req.user = user;
    } catch (error) {
        console.log("CheckUserId middleware error:", error);
    }
    next();
};