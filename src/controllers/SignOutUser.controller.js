import { BlockedToken } from "../service/token.service.js";

export const SignOutUser = async (req, res) => {
    try {
        const token = req.cookies?.Access || req.headers?.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ error: "Unauthorized" });
        await BlockedToken(token, req.user?.id);
        res.clearCookie("Access");
        return res.status(200).json({ message: "Logout Successfully" });
    } catch (error) {
        console.error("SignOut Error:", error);
        return res.status(500).json({ error: "Failed to logout securely" });
    }
}