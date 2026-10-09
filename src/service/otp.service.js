import nodemailer from "nodemailer";
import { randomInt } from "crypto";

// Generate a 6-digit random OTP code using cryptographically secure randomness
export const GenerateOtp = () => {
    return randomInt(100000, 999999).toString();
};

// Create a simple Nodemailer transporter using Gmail service
const createTransporter = () => {
    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 15000,
        family: 4, // Force IPv4 connection to prevent ENETUNREACH
        tls: {
            rejectUnauthorized: true
        }
    });
};

// Send Password Reset OTP Email
export const SendOtpEmail = async (email, otp) => {
    const hasSmtpConfig = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

    if (hasSmtpConfig) {
        try {
            const transporter = createTransporter();

            const mailOptions = {
                from: `"LinkVault Security" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: `${otp} is your LinkVault Password Reset Code`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                        <h2 style="color: #4338ca; text-align: center;">LinkVault</h2>
                        <p style="font-size: 16px; color: #333;">Your verification code to reset password is:</p>
                        <div style="text-align: center; font-size: 32px; font-weight: bold; color: #4338ca; letter-spacing: 4px; padding: 10px; background: #e0e7ff; border-radius: 6px; margin: 15px 0;">
                            ${otp}
                        </div>
                        <p style="font-size: 13px; color: #666;">This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions);
            console.log(`[EMAIL SENT] OTP sent to ${email}`);
            return { success: true, method: "smtp" };
        } catch (error) {
            console.error("[SMTP ERROR] Could not deliver email via SMTP:", error.message);
            console.log("👉 Falling back to local terminal console logger...");
        }
    }

    // Console logger fallback:
    console.log("\n=======================================================");
    console.log("🔐 [LINKVAULT OTP VERIFICATION CODE]");
    console.log(`👤 Recipient Email : ${email}`);
    console.log(`🔑 6-Digit OTP Code : >>> ${otp} <<<`);
    console.log(`⏱️ Validity         : 10 Minutes`);
    console.log("=======================================================\n");

    return { success: true, method: "console" };
};

// Send Signup Verification OTP Email
export const SendSignupOtpEmail = async (email, otp) => {
    const hasSmtpConfig = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

    if (hasSmtpConfig) {
        try {
            const transporter = createTransporter();

            const mailOptions = {
                from: `"LinkVault Security" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: `${otp} is your LinkVault Registration Code`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                        <h2 style="color: #4338ca; text-align: center;">LinkVault</h2>
                        <p style="font-size: 16px; color: #333;">Welcome! Your 6-digit registration code is:</p>
                        <div style="text-align: center; font-size: 32px; font-weight: bold; color: #4338ca; letter-spacing: 4px; padding: 10px; background: #e0e7ff; border-radius: 6px; margin: 15px 0;">
                            ${otp}
                        </div>
                        <p style="font-size: 13px; color: #666;">This code is valid for 10 minutes.</p>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions);
            console.log(`[SIGNUP EMAIL SENT] Registration OTP sent to ${email}`);
            return { success: true, method: "smtp" };
        } catch (error) {
            console.error("[SMTP ERROR] Could not deliver signup email via SMTP:", error.message);
            console.log("👉 Falling back to local terminal console logger...");
        }
    }

    // Console logger fallback:
    console.log("\n=======================================================");
    console.log("🔐 [LINKVAULT SIGNUP OTP VERIFICATION CODE]");
    console.log(`👤 Recipient Email : ${email}`);
    console.log(`🔑 6-Digit OTP Code : >>> ${otp} <<<`);
    console.log(`⏱️ Validity         : 10 Minutes`);
    console.log("=======================================================\n");

    return { success: true, method: "console" };
};
