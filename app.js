import 'dotenv/config';
import express from "express";
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import cookieParser from "cookie-parser";
import { body, param } from "express-validator";

import User from "./src/Routes/User.routes.js";
import short_url from "./src/Routes/Short_Url.routes.js";
import adminRoutes from "./src/admin/admin.routes.js";
import aiRoutes from "./src/Routes/ai.routes.js";
import ConnectDB from "./src/config/Connectdb.js";
import { RedirectToUrl } from "./src/controllers/CreateShortUrl.controller.js";
import { CheckUserId } from "./src/middleware/Add_User.js";
import { DeleteUrls } from "./src/controllers/DeleteUrl.controller.js";
import { Auth } from "./src/middleware/Auth.middleware.js";

const app = express();
app.set('trust proxy', 1);
const port = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Security Headers (configured for Serverless API)
// ---------------------------------------------------------------------------
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xContentTypeOptions: true,
    xFrameOptions: { action: 'deny' },
}));

// ---------------------------------------------------------------------------
// Rate Limiting
// ---------------------------------------------------------------------------
const globalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
    skip: (req) => req.method === 'OPTIONS',
});
app.use(globalLimiter);

const authLimiter = rateLimit({
    windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many authentication attempts. Please try again after 15 minutes." },
    skip: (req) => req.method === 'OPTIONS',
});

// ---------------------------------------------------------------------------
// CORS Configuration (Seamless Vercel & Production Support)
// ---------------------------------------------------------------------------
const allowedOrigins = [
    "https://shorturl-priteshs-projects-702bd372.vercel.app",
    "https://shorturl-git-main-priteshs-projects-702bd372.vercel.app",
    "https://short-url-frontend-omega.vercel.app",
];

if (process.env.FRONTEND_URL) {
    const urls = process.env.FRONTEND_URL.split(',').map(u => u.trim().replace(/\/$/, ''));
    for (const u of urls) {
        if (!allowedOrigins.includes(u)) allowedOrigins.push(u);
    }
}

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, server-to-server, health checks)
        if (!origin) return callback(null, true);

        // In development, allow localhost and 127.0.0.1 on any port
        if (process.env.NODE_ENV !== 'production') {
            if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
                return callback(null, true);
            }
        }

        // Allow any Vercel frontend deployment (production, preview branches, PR previews)
        if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

// ---------------------------------------------------------------------------
// Body Parsing, Cookies & Sanitization
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Express 5 compatible NoSQL sanitization
app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = mongoSanitize.sanitize(req.body);
    }
    if (req.params && typeof req.params === 'object') {
        req.params = mongoSanitize.sanitize(req.params);
    }
    next();
});
app.use(hpp());

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const morgan = (await import("morgan")).default;
    app.use(morgan('dev'));
}

// ---------------------------------------------------------------------------
// Database Connection Middleware (Resilient for Vercel Serverless Cold Starts)
// ---------------------------------------------------------------------------
app.use(async (req, res, next) => {
    if (req.path === '/') return next(); // Health check responds without DB

    try {
        await ConnectDB();
        next();
    } catch (err) {
        console.error("Database connection failure:", err.message);
        return res.status(503).json({
            success: false,
            error: "Database Connection Error",
            message: "Database connection unavailable. Please verify your MongoUrl environment variable on Vercel."
        });
    }
});

// ---------------------------------------------------------------------------
// User Context Middleware
// ---------------------------------------------------------------------------
app.use(CheckUserId);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.get('/', (req, res) => {
    res.status(200).json({ status: "ok", message: "LinkVault API is active" });
});

// Sensitive auth routes with rate limiting
app.use("/user/signin", authLimiter);
app.use("/user/signup", authLimiter);
app.use("/user/send-signup-otp", authLimiter);
app.use("/user/send-otp", authLimiter);
app.use("/user/forgot-password", authLimiter);
app.use("/user/verify-otp", authLimiter);
app.use("/user/reset-password", authLimiter);
app.use("/admin/login", authLimiter);
app.use("/admin/signin", authLimiter);

app.use("/ShortUrl", short_url);
app.use('/user', User);
app.use('/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// Public redirect route
app.get('/:id',
    param('id')
        .notEmpty().withMessage("ShortUrlID is Missing In ShortUrl")
        .isString().withMessage("Invalid ShortUrl")
        .trim()
        .isAlphanumeric().withMessage("Invalid ShortUrl format")
        .isLength({ max: 30 }).withMessage("Invalid ShortUrl")
    , RedirectToUrl);

// Protected delete route
app.post('/delete',
    Auth,
    body('id')
        .notEmpty().withMessage("ShortUrlID is Missing In ShortUrl")
        .trim()
        .isMongoId().withMessage("Invalid URL ID format")
    , DeleteUrls);

// ---------------------------------------------------------------------------
// 404 Catch-All Handler
// ---------------------------------------------------------------------------
app.use((req, res) => {
    res.status(404).json({
        success: false,
        statusCode: 404,
        error: "Route Not Found",
    });
});

// ---------------------------------------------------------------------------
// Global Error Handler
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production'
            ? "Internal Server Error"
            : err.message
    });
});

// ---------------------------------------------------------------------------
// Database Connection & Server Start
// ---------------------------------------------------------------------------
ConnectDB().catch((err) => {
    if (process.env.NODE_ENV !== 'production') {
        console.warn("Initial MongoDB connection notice:", err.message);
    }
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

export default app;
