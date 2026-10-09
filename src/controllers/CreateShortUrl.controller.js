import { CreateNanoID } from "../service/CreateNoneID.service.js";
import { StoreShortUrl, FindUrl, CheckShortUrl } from "../Dao/ShortUrlQuerys.js";
import { validationResult } from "express-validator";

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
    } else {
        ShortUrl = CreateNanoID(6);
    }

    try {
        const hasShortUrl = await CheckShortUrl(ShortUrl);
        if (hasShortUrl) {
            return res.status(400).json({ error: "Short URL / Custom Slug already exists" });
        }

        const userId = req.user?.id || req.user?._id;
        const data = await StoreShortUrl(normalizedUrl, ShortUrl, userId);

        if (!data) {
            return res.status(500).json({ error: "Failed to store URL in database" });
        }

        const domain = (process.env.Domain || "http://localhost:3000/").trim();
        const baseDomain = domain.endsWith("/") ? domain : `${domain}/`;

        return res.status(200).json({
            ShortUrl: baseDomain + data.Short_Url,
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