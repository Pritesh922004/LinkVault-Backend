import { BlockedToken } from "../service/token.service.js";
import { cookieOptions } from "../utilities/cookieOptions.js";
import { VerifyToken } from "../service/User.service.js";

export const SignOutUser = async (req, res) => {
    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").trim();

    try {
        const token = req.cookies?.Access || req.headers?.authorization?.replace(/^Bearer\s+/i, '');
        if (token) {
            try {
                const user = req.user || await VerifyToken(token);
                if (user?.id || user?._id) {
                    await BlockedToken(token, user.id || user._id);
                }
            } catch {
                // Ignore token decode failures during logout cleanup
            }
        }
        res.clearCookie("Access", cookieOptions());
        return res.redirect(frontendUrl);
    } catch (error) {
        console.error("SignOut Error:", error);
        return res.redirect(frontendUrl);
    }
};