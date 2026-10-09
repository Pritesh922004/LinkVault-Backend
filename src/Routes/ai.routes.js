import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { reviewCode, translateDoc } from '../controllers/ai.controller.js';

const router = express.Router();

// Dedicated rate limiter for AI endpoints to prevent abuse and protect API quotas
const aiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 25, // 25 AI requests per 15 min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "You have reached the AI request limit. Please wait a few minutes before trying again."
    },
    skip: (req) => req.method === 'OPTIONS',
});

// Configure Multer for in-memory file parsing (limit: 5MB, restricted file types)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'application/pdf',
            'text/plain',
            'text/markdown',
            'text/csv',
            'application/json',
        ];
        if (allowedMimes.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.pdf')) {
            cb(null, true);
        } else {
            cb(new Error('File type not allowed. Only PDF, TXT, MD, CSV, and JSON files are accepted.'));
        }
    }
});

// Route 1: Code Review (protected with AI rate limiting)
router.post('/code-review', aiRateLimiter, reviewCode);

// Route 2: Document / PDF Translation (protected with AI rate limiting)
router.post('/translate-doc', aiRateLimiter, upload.single('document'), translateDoc);

export default router;
