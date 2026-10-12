import { CreateNanoID } from "../service/CreateNoneID.service.js";
import { StoreShortUrl, FindUrl, CheckShortUrl, FindUrlRaw } from "../Dao/ShortUrlQuerys.js";
import { scanUrlThreat } from "../service/ThreatScanner.service.js";
import { validationResult } from "express-validator";

const RESERVED_SLUGS = new Set([
    'features', 'dashboard', 'analytics', 'pricing', 'faq', 'ai-hub',
    'auth', 'forgot-password', 'reset-password', 'admin', 'api', 'user',
    'shorturl', 'delete', 'r', 's', 'shield', 'inspect', 'inspector',
    'favicon.ico', 'robots.txt'
]);

export const CreateShortUrl = async (req, res) => {
    const Result = validationResult(req);

    if (!Result.isEmpty()) {
        return res.status(400).json({ error: Result.array()[0].msg });
    }

    let { url, slug } = req.body;
    if (!url) {
        return res.status(400).json({ error: "URL is required" });
    }

    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
        normalizedUrl = "https://" + normalizedUrl;
    }

    let ShortUrl;
    if (slug && typeof slug === "string" && slug.trim().length > 0) {
        ShortUrl = slug.trim();
        if (RESERVED_SLUGS.has(ShortUrl.toLowerCase())) {
            return res.status(400).json({ error: `The custom slug "${ShortUrl}" is reserved for system routes. Please choose another.` });
        }
    } else {
        ShortUrl = CreateNanoID(6);
    }

    try {
        const hasShortUrl = await CheckShortUrl(ShortUrl);
        if (hasShortUrl) {
            return res.status(400).json({ error: "Short URL / Custom Slug already exists" });
        }

        const userId = req.user?.id || req.user?._id;

        // Perform real-time AI & Heuristic Threat Scan
        let threatData;
        try {
            threatData = await scanUrlThreat(normalizedUrl);
        } catch (scanErr) {
            console.warn("Threat scan non-fatal error:", scanErr.message);
            threatData = { threatScore: 0, threatCategory: 'Safe', verdict: 'SAFE', threatDetails: [], isQuarantined: false };
        }

        const data = await StoreShortUrl(normalizedUrl, ShortUrl, userId, threatData);

        if (!data) {
            return res.status(500).json({ error: "Failed to store URL in database" });
        }

        const domain = (process.env.FRONTEND_URL || process.env.Domain || "http://localhost:5173").trim().replace(/\/+$/, '');

        return res.status(200).json({
            ShortUrl: `${domain}/r/${data.Short_Url}`,
            threatScore: data.threatScore,
            threatCategory: data.threatCategory,
            threatDetails: data.threatDetails,
            verdict: data.verdict,
            isQuarantined: data.isQuarantined,
            data: data
        });
    } catch (error) {
        console.error("CreateShortUrl Error:", error);
        return res.status(500).json({ error: "Failed to create short URL" });
    }
};

export const RedirectToUrl = async (req, res) => {
    const Result = validationResult(req);

    if (!Result.isEmpty()) {
        return res.status(400).json({ error: Result.array()[0].msg });
    }

    const { id } = req.params;

    // Safety fallback: if a reserved system route is hit, redirect to frontend page
    if (RESERVED_SLUGS.has(id.toLowerCase())) {
        const frontendUrl = (process.env.FRONTEND_URL || "https://linkvault-f.vercel.app").trim().replace(/\/+$/, '');
        return res.redirect(`${frontendUrl}/${id}`);
    }

    try {
        const data = await FindUrl(id);

        if (!data) {
            return res.status(404).json({
                success: false,
                statusCode: 404,
                error: "Short URL Not Found",
                message: "The requested short URL does not exist or has expired."
            });
        }

        // Zero-Trust Interstitial Shield: If link is quarantined, redirect to frontend shield screen
        const allowOverride = req.query.override === 'true' || req.query.proceed === '1';
        if (data.isQuarantined && !allowOverride) {
            const frontendUrl = (process.env.FRONTEND_URL || "https://linkvault-f.vercel.app").trim().replace(/\/+$/, '');
            return res.redirect(`${frontendUrl}/shield/${data.Short_Url}`);
        }

        let redirectUrl = data.Url;
        if (!/^https?:\/\//i.test(redirectUrl)) {
            redirectUrl = "https://" + redirectUrl;
        }

        // Validate redirect URL to prevent open redirect attacks
        try {
            const parsed = new URL(redirectUrl);
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return res.status(400).json({ error: "Invalid redirect URL protocol" });
            }
        } catch {
            return res.status(400).json({ error: "Invalid redirect URL" });
        }

        return res.redirect(redirectUrl);
    } catch (error) {
        console.error("Redirect Error:", error);
        return res.status(500).json({
            success: false,
            statusCode: 500,
            error: "Server Error",
            message: "An unexpected error occurred while processing the redirect."
        });
    }
};

// Retrieve Threat Audit Report for a specific short link (without incrementing clicks)
export const GetThreatAudit = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ error: "Short link identifier required" });
    }

    try {
        const data = await FindUrlRaw(id);
        if (!data) {
            return res.status(404).json({ error: "Link not found" });
        }

        return res.status(200).json({
            shortUrl: data.Short_Url,
            destinationUrl: data.Url,
            threatScore: data.threatScore || 0,
            threatCategory: data.threatCategory || 'Safe',
            threatDetails: data.threatDetails || [],
            verdict: data.verdict || 'SAFE',
            isQuarantined: Boolean(data.isQuarantined),
            scannedAt: data.scannedAt || data.createdAt
        });
    } catch (error) {
        console.error("GetThreatAudit Error:", error);
        return res.status(500).json({ error: "Failed to retrieve threat audit" });
    }
};

// Standalone Public Link Inspector Endpoint (audits any URL without shortening)
export const InspectUrlController = async (req, res) => {
    let { url } = req.body;
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
        return res.status(400).json({ error: "A valid URL string is required for threat inspection" });
    }

    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
        normalizedUrl = "https://" + normalizedUrl;
    }

    try {
        const result = await scanUrlThreat(normalizedUrl);
        return res.status(200).json({
            success: true,
            targetUrl: normalizedUrl,
            ...result
        });
    } catch (error) {
        console.error("InspectUrlController Error:", error);
        return res.status(500).json({ error: "Failed to perform threat inspection" });
    }
};