import { FetchUrls } from "../Dao/ShortUrlQuerys.js";

export const GetAllUrls = async (req, res) => {
    try {
        const UserId = req.user?.id;
        const data = await FetchUrls(UserId);
        return res.status(200).json({ data });
    } catch (error) {
        console.error("GetAllUrls Error:", error);
        return res.status(500).json({ error: "Failed to fetch URLs" });
    }
}