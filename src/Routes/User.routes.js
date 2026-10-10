import express from 'express';
import { body } from 'express-validator';
import { Signup, SendSignupOtpController } from '../controllers/signup.controller.js';
import { SignIn } from '../controllers/signin.controller.js';
import { VerifyUser } from '../controllers/VerifyUser.controller.js';
import { Auth } from '../middleware/Auth.middleware.js';
import { SignOutUser } from '../controllers/SignOutUser.controller.js';
import {
    SendOtpController,
    VerifyOtpController,
    ResetPasswordController
} from '../controllers/forgotPassword.controller.js';

const route = express.Router();

// Registration & Login
route.post('/send-signup-otp',
    body('email')
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Please provide a valid email address")
        .trim(),
    SendSignupOtpController
);

route.post('/signup',
    body('name')
        .notEmpty().withMessage("Name is required")
        .isString().withMessage("Name should be a string")
        .trim()
        .isLength({ min: 3 }).withMessage("Name should be at least 3 characters")
        .isLength({ max: 20 }).withMessage("Name should be at most 20 characters"),
    body('email')
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Invalid Email")
        .trim(),
    body('password')
        .notEmpty().withMessage("Password is required")
        .isString().withMessage("Password should be a string")
        .trim()
        .isLength({ min: 6 }).withMessage("Password should be at least 6 characters"),
    body('otp')
        .notEmpty().withMessage("Verification code is required")
        .isLength({ min: 6, max: 6 }).withMessage("Verification code must be 6 digits")
        .trim()
    , Signup);


route.post('/signin',
    body('email')
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Invalid Email")
        .trim(),
    body('password')
        .notEmpty().withMessage("Password is required")
        .isString().withMessage("Password should be a string")
        .trim()
    , SignIn);

// Session Verification & Logout
route.get('/verify', Auth, VerifyUser);
route.all('/signout', SignOutUser);

// Forgot Password & OTP Endpoints
route.post('/send-otp',
    body('email')
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Please provide a valid email address")
        .trim(),
    SendOtpController
);

route.post('/forgot-password',
    body('email')
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Please provide a valid email address")
        .trim(),
    SendOtpController
);

route.post('/verify-otp',
    body('email')
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Please provide a valid email address")
        .trim(),
    body('otp')
        .notEmpty().withMessage("OTP is required")
        .isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits")
        .trim(),
    VerifyOtpController
);

route.post('/reset-password',
    body('email')
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Please provide a valid email address")
        .trim(),
    body('otp')
        .notEmpty().withMessage("OTP is required")
        .isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits")
        .trim(),
    body('newPassword')
        .notEmpty().withMessage("New password is required")
        .isLength({ min: 6 }).withMessage("Password must be at least 6 characters long")
        .trim(),
    ResetPasswordController
);

export default route;