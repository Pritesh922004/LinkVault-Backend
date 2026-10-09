import express from 'express';
import { CreateShortUrl } from '../controllers/CreateShortUrl.controller.js';
import { body } from 'express-validator';
import { Auth } from '../middleware/Auth.middleware.js';
import { GetAllUrls } from '../controllers/GetAllUrls.controller.js';

const route = express.Router();

const RESERVED_SLUGS = new Set([
    'admin', 'api', 'user', 'users', 'shorturl', 'delete', 'auth',
    'signin', 'signup', 'signout', 'dashboard', 'login', 'logout',
    'verify', 'stats', 'faq', 'pricing', 'features', 'favicon', 'robots',
    'sitemap', 'null', 'undefined', 'static', 'assets'
]);

route.post('/Create',
    body('url')
        .notEmpty().withMessage("URL is required")
        .trim()
        .isLength({ max: 2048 }).withMessage("URL must not exceed 2048 characters")
        .custom((value) => {
            if (!value) throw new Error("URL is required");
            try {
                const hasProtocol = /^https?:\/\//i.test(value);
                const urlToCheck = hasProtocol ? value : 'https://' + value;
                const parsed = new URL(urlToCheck);

                if (!['http:', 'https:'].includes(parsed.protocol)) {
                    throw new Error("Only HTTP and HTTPS protocols are permitted");
                }

                if (!parsed.hostname || (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost')) {
                    throw new Error("Invalid URL domain");
                }

                // Disallow dangerous schemes or local loopback in production
                if (process.env.NODE_ENV === 'production' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '0.0.0.0')) {
                    throw new Error("Localhost URLs are not allowed in production");
                }

                return true;
            } catch (e) {
                throw new Error(e.message || "Incorrect URL format");
            }
        }),
    body('slug')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 3, max: 30 }).withMessage("Custom slug must be between 3 and 30 characters")
        .matches(/^[a-zA-Z0-9_-]+$/).withMessage("Custom slug may only contain letters, numbers, hyphens, and underscores")
        .custom((value) => {
            if (value && RESERVED_SLUGS.has(value.toLowerCase())) {
                throw new Error("This custom slug is reserved and cannot be used");
            }
            return true;
        })
    , CreateShortUrl);

route.get('/all', Auth, GetAllUrls);

export default route;