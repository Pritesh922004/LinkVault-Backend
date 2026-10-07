import mongoose from "mongoose";

const ConnectDB = async () => {
    try {
        await mongoose.connect(process.env.MongoUrl);
        console.log("✅ Mongodb Is Connected");
    } catch (error) {
        console.error("❌ Mongodb Connection Error:", error);
        process.exit(1);
    }
}

export default ConnectDB;