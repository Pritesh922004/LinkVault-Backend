import { validationResult } from "express-validator";
import {
    FindUser,
    SaveOtpRecord,
    FindOtpRecord,
    DeleteOtpRecord,
    UpdateUserPassword
} from "../Dao/user.querys.js";
import { GenerateOtp, SendOtpEmail } from "../service/otp.service.js";

export const SendOtpController = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { email } = req.body;

    try {
        const user = await FindUser(email);

        // Always return the same response to prevent user enumeration
        const successResponse = {
            message: "If an account with that email exists, a verification code has been sent.",
            email: email.toLowerCase().trim()
        };

        if (!user) {
            // Don't reveal that the user doesn't exist — return same message
            return res.status(200).json(successResponse);
        }

        const otp = GenerateOtp();
        await SaveOtpRecord(email, otp);
        await SendOtpEmail(email, otp);

        return res.status(200).json(successResponse);
    } catch (error) {
        console.error("SendOtpController Error:", error);
        return res.status(500).json({
            error: "Failed to send verification code. Please try again."
        });
    }
};

export const VerifyOtpController = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { email, otp } = req.body;

    try {
        const otpRecord = await FindOtpRecord(email, otp);
        if (!otpRecord) {
            return res.status(400).json({
                error: "Invalid or expired verification code. Please request a new one."
            });
        }

        return res.status(200).json({
            message: "Verification code verified successfully.",
            verified: true
        });
    } catch (error) {
        console.error("VerifyOtpController Error:", error);
        return res.status(500).json({
            error: "Failed to verify code. Please try again."
        });
    }
};

export const ResetPasswordController = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { email, otp, newPassword } = req.body;

    try {
        // Verify OTP one more time before mutating password
        const otpRecord = await FindOtpRecord(email, otp);
        if (!otpRecord) {
            return res.status(400).json({
                error: "Invalid or expired verification code. Please request a new one."
            });
        }

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({
                error: "Password must be at least 6 characters long."
            });
        }

        const updatedUser = await UpdateUserPassword(email, newPassword);
        if (!updatedUser) {
            return res.status(404).json({
                error: "User not found."
            });
        }

        // Delete used OTP so it cannot be reused
        await DeleteOtpRecord(email);

        return res.status(200).json({
            message: "Password has been reset successfully. You can now sign in with your new password."
        });
    } catch (error) {
        console.error("ResetPasswordController Error:", error);
        return res.status(500).json({
            error: "Failed to reset password. Please try again."
        });
    }
};
