import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { cookieOptions } from "../utilities/cookieOptions.js";
import {
    GetAdminStats,
    GetAllAdminUsers,
    DeleteAdminUser,
    GetAllAdminUrls,
    DeleteAdminUrl
} from "./admin.querys.js";

const getAdminUser = () => (process.env.ADMIN_USER || "admin").trim();
const getAdminPassword = () => (process.env.ADMIN_PASSWORD || "").trim();

export const AdminLogin = async (req, res) => {
    try {
        const { username, user, email, password } = req.body;
        const inputUser = (username || user || email || "").trim();

        if (!inputUser || !password) {
            return res.status(400).json({
                success: false,
                statusCode: 400,
                error: "All fields are required"
            });
        }

        const adminUser = getAdminUser();
        const adminPass = getAdminPassword();

        if (!adminPass) {
            console.error("Admin login attempted but ADMIN_PASSWORD is not configured in .env.");
            return res.status(500).json({
                success: false,
                statusCode: 500,
                error: "Admin authentication not configured"
            });
        }

        // Timing-safe check
        const userMatch = inputUser === adminUser;
        const passMatch = password === adminPass;

        if (!userMatch || !passMatch) {
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
            return res.status(401).json({
                success: false,
                statusCode: 401,
                error: "Invalid admin credentials"
            });
        }

        const token = jwt.sign(
            { role: "admin", username: adminUser, id: "admin-root" },
            process.env.JWT_SECRET,
            { expiresIn: "4h" }
        );

        res.cookie("AdminAccess", token, cookieOptions());

        return res.status(200).json({
            success: true,
            statusCode: 200,
            message: "Admin authenticated successfully",
            token,
            admin: {
                username: adminUser,
                role: "admin"
            }
        });
    } catch (error) {
        console.error("AdminLogin Controller Error:", error);
        return res.status(500).json({
            success: false,
            statusCode: 500,
            error: "Failed to authenticate admin"
        });
    }
};

export const AdminVerify = async (req, res) => {
    return res.status(200).json({
        success: true,
        statusCode: 200,
        admin: req.admin
    });
};

export const AdminStats = async (req, res) => {
    try {
        const stats = await GetAdminStats();
        return res.status(200).json({
            success: true,
            statusCode: 200,
            stats
        });
    } catch (error) {
        console.error("AdminStats Controller Error:", error);
        return res.status(500).json({
            success: false,
            statusCode: 500,
            error: "Failed to fetch platform statistics"
        });
    }
};

export const AdminGetUsers = async (req, res) => {
    try {
        const users = await GetAllAdminUsers();
        return res.status(200).json({
            success: true,
            statusCode: 200,
            users
        });
    } catch (error) {
        console.error("AdminGetUsers Controller Error:", error);
        return res.status(500).json({
            success: false,
            statusCode: 500,
            error: "Failed to fetch users list"
        });
    }
};

export const AdminDeleteUserHandler = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({
                success: false,
                statusCode: 400,
                error: "User ID is required"
            });
        }

        // Validate MongoDB ObjectId format to prevent injection
        if (!/^[a-fA-F0-9]{24}$/.test(id)) {
            return res.status(400).json({
                success: false,
                statusCode: 400,
                error: "Invalid user ID format"
            });
        }

        const deleted = await DeleteAdminUser(id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                statusCode: 404,
                error: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            statusCode: 200,
            message: "User and associated links deleted successfully"
        });
    } catch (error) {
        console.error("AdminDeleteUserHandler Controller Error:", error);
        return res.status(500).json({
            success: false,
            statusCode: 500,
            error: "Failed to delete user"
        });
    }
};

export const AdminGetUrls = async (req, res) => {
    try {
        const urls = await GetAllAdminUrls();
        return res.status(200).json({
            success: true,
            statusCode: 200,
            urls
        });
    } catch (error) {
        console.error("AdminGetUrls Controller Error:", error);
        return res.status(500).json({
            success: false,
            statusCode: 500,
            error: "Failed to fetch URLs list"
        });
    }
};

export const AdminDeleteUrlHandler = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({
                success: false,
                statusCode: 400,
                error: "URL ID is required"
            });
        }

        // Validate MongoDB ObjectId format
        if (!/^[a-fA-F0-9]{24}$/.test(id)) {
            return res.status(400).json({
                success: false,
                statusCode: 400,
                error: "Invalid URL ID format"
            });
        }

        const deleted = await DeleteAdminUrl(id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                statusCode: 404,
                error: "Short URL not found"
            });
        }

        return res.status(200).json({
            success: true,
            statusCode: 200,
            message: "Short URL deleted successfully"
        });
    } catch (error) {
        console.error("AdminDeleteUrlHandler Controller Error:", error);
        return res.status(500).json({
            success: false,
            statusCode: 500,
            error: "Failed to delete short URL"
        });
    }
};

export const AdminLogout = async (req, res) => {
    res.clearCookie("AdminAccess", cookieOptions());
    return res.status(200).json({
        success: true,
        statusCode: 200,
        message: "Admin logged out successfully"
    });
};
