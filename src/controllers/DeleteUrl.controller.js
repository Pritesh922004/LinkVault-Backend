import ShortUrlSchema from "../models/Short_Url.js";

export const DeleteUrls = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ error: "URL ID is required" });
        }

        // Validate MongoDB ObjectId format
        if (!/^[a-fA-F0-9]{24}$/.test(id)) {
            return res.status(400).json({ error: "Invalid URL ID format" });
        }

        // Find the URL first to check ownership
        const urlRecord = await ShortUrlSchema.findById(id);
        if (!urlRecord) {
            return res.status(404).json({ error: "URL not found" });
        }

        // Authorization: users can only delete their own URLs
        const userId = req.user?.id || req.user?._id;
        if (!userId || urlRecord.User?.toString() !== userId.toString()) {
            return res.status(403).json({ error: "You can only delete your own URLs" });
        }

        await ShortUrlSchema.findByIdAndDelete(id);
        return res.status(200).json({ message: "Deleted" });
    } catch (error) {
        console.error("DeleteUrls Error:", error);
        return res.status(500).json({ error: "Failed to delete URL" });
    }
}