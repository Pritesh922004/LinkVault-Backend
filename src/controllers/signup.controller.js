import { validationResult } from "express-validator";
import { AddUser, FindUser, SaveOtpRecord, FindOtpRecord, DeleteOtpRecord } from "../Dao/user.querys.js";
import { cookieOptions } from "../utilities/cookieOptions.js";
import { CreateToken } from "../service/User.service.js";
import { GenerateOtp, SendSignupOtpEmail } from "../service/otp.service.js";

export const SendSignupOtpController = async (req, res) => {
    const Result = validationResult(req);
    if (!Result.isEmpty()) return res.status(400).json({ error: Result.array()[0].msg });

    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
        const existingUser = await FindUser(email);
        if (existingUser) {
            return res.status(400).json({ error: "User already exists with this email address" });
        }

        const otp = GenerateOtp();
        await SaveOtpRecord(email, otp);
        await SendSignupOtpEmail(email, otp);

        return res.status(200).json({
            message: "A 6-digit verification code has been sent to your email.",
            email: email.toLowerCase().trim()
        });
    } catch (error) {
        console.error("SendSignupOtpController Error:", error);
        return res.status(500).json({ error: "Failed to send verification code. Please try again." });
    }
};

export const Signup = async (req, res) => {
    const Result = validationResult(req);
    if (!Result.isEmpty()) return res.status(400).json({ error: Result.array()[0].msg });

    const { name, email, password, otp } = req.body;

    if (!name || !email || !password || !otp) {
        return res.status(400).json({ error: "All fields including verification code are required" });
    }

    try {
        const user = await FindUser(email);
        if (user) return res.status(400).json({ error: "User already exists" });

        // Verify OTP code
        const otpRecord = await FindOtpRecord(email, otp);
        if (!otpRecord) {
            return res.status(400).json({
                error: "Invalid or expired verification code. Please request a new code."
            });
        }

        const data = await AddUser(name, email, password);
        if (!data) return res.status(500).json({ error: "Something went wrong creating user" });

        // Delete used OTP
        await DeleteOtpRecord(email);

        const token = await CreateToken(data._id);
        if (!token) return res.status(500).json({ error: "Something went wrong generating session token" });

        delete data._doc.password;

        res.cookie("Access", token, cookieOptions());

        return res.status(201).json({ message: "Signup Successfully", user: data, token: token });
    } catch (error) {
        console.error("Signup Controller Error:", error);
        return res.status(500).json({ error: "Failed to create account. Please try again." });
    }
};
