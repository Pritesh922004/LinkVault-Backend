import mongoose from "mongoose";

let isConnected = false;

const ConnectDB = async () => {
    if (isConnected) return;
    try {
        const db = await mongoose.connect(process.env.MongoUrl);
        isConnected = db.connections[0].readyState === 1;
        console.log("Mongodb Is Connected");
    } catch (error) {
        console.error("Mongodb Connection Error:", error);
        if (!process.env.VERCEL) {
            process.exit(1);
        }
        throw error;
    }
}

export default ConnectDB;