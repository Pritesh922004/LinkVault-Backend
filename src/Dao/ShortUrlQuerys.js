import ShortUrlSchema from "../models/Short_Url.js";

export const StoreShortUrl = async (Url, ShortUrl, UserID, threatData = {}) => {
    try {
        const doc = {
            Url: Url,
            Short_Url: ShortUrl,
            threatScore: threatData.threatScore ?? 0,
            threatCategory: threatData.threatCategory ?? 'Safe',
            threatDetails: threatData.threatDetails ?? [],
            verdict: threatData.verdict ?? 'SAFE',
            isQuarantined: threatData.isQuarantined ?? false,
            scannedAt: threatData.scannedAt ?? new Date(),
        };
        if (UserID) {
            doc.User = UserID;
        }
        return await ShortUrlSchema.create(doc);
    } catch (error) {
        console.error("StoreShortUrl DAO Error:", error);
        throw error;
    }
};

export const FindUrlRaw = async (id) => {
    try {
        return await ShortUrlSchema.findOne({ Short_Url: id });
    } catch (error) {
        console.error("FindUrlRaw DAO Error:", error);
        throw error;
    }
};

export const UpdateThreatAudit = async (id, threatData) => {
    try {
        return await ShortUrlSchema.findOneAndUpdate(
            { Short_Url: id },
            {
                $set: {
                    threatScore: threatData.threatScore,
                    threatCategory: threatData.threatCategory,
                    threatDetails: threatData.threatDetails,
                    verdict: threatData.verdict,
                    isQuarantined: threatData.isQuarantined,
                    scannedAt: new Date()
                }
            },
            { new: true }
        );
    } catch (error) {
        console.error("UpdateThreatAudit DAO Error:", error);
        throw error;
    }
};

export const FindUrl = async (id) => {
    try {
        const data = await ShortUrlSchema.findOneAndUpdate({ Short_Url: id }, { $inc: { Clicks: 1 } }, { new: true });
        return data;
    } catch (error) {
        console.error("FindUrl DAO Error:", error);
        throw error;
    }
};

export const CheckShortUrl = async (id) => {
    try {
        return await ShortUrlSchema.findOne({ Short_Url: id });
    } catch (error) {
        console.error("CheckShortUrl DAO Error:", error);
        throw error;
    }
};

export const FetchUrls = async (UserId) => {
    try {
        return await ShortUrlSchema.find({ User: UserId }).sort({ createdAt: -1 });
    } catch (error) {
        console.error("FetchUrls DAO Error:", error);
        throw error;
    }
};

