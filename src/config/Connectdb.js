import mongoose from "mongoose";

let cachedPromise = null;

const ConnectDB = async () => {
    // Return immediately if already connected (readyState: 1 = connected)
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    // Reuse existing connection attempt during cold start concurrency
    if (cachedPromise) {
        return cachedPromise;
    }

    const mongoUrl = process.env.MongoUrl || process.env.MONGO_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUrl) {
        const err = new Error("MongoDB connection string is missing. Please set MongoUrl (or MONGODB_URI) in your Vercel Project Settings > Environment Variables.");
        console.error("Database Configuration Error:", err.message);
        throw err;
    }

    cachedPromise = mongoose.connect(mongoUrl, {
        autoIndex: process.env.NODE_ENV !== 'production',
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
    }).then((m) => {
        cachedPromise = null;
        if (process.env.NODE_ENV !== 'production') {
            console.log("MongoDB connected successfully");
        }
        return m;
    }).catch((err) => {
        cachedPromise = null;
        console.error("MongoDB Connection Error:", err.message);
        throw err;
    });

    return cachedPromise;
};

export default ConnectDB;