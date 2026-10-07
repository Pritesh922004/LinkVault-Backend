import { DeleteUrl } from "../Dao/DeleteUrl.js";

export const DeleteUrls = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ error: "URL ID is required" });
        }
        await DeleteUrl(id);
        return res.status(200).json({ message: "Deleted" });
    } catch (error) {
        console.error("DeleteUrls Error:", error);
        return res.status(500).json({ error: "Failed to delete URL" });
    }
}