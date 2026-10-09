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

    const mongoUrl = process.env.MongoUrl;
    if (!mongoUrl) {
        const err = new Error("MongoUrl environment variable is not defined. Please configure it in your Vercel Project Settings > Environment Variables.");
        console.error("Database Configuration Error:", err.message);
        throw err;
    }

    cachedPromise = mongoose.connect(mongoUrl, {
        autoIndex: process.env.NODE_ENV !== 'production',
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10, // Optimal pool size for serverless functions
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