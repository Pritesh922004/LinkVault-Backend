import mongoose from "mongoose";

const ShortUrlSchema = new mongoose.Schema({
    Url: {
        type: String,
        required: true,
        trim: true
    },
    Short_Url: {
        type: String,
        required: true,
        unique: true
    },
    Clicks: {
        type: Number,
        default: 0
    },
    User: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    // Cybersecurity Threat Detection Fields
    threatScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    threatCategory: {
        type: String,
        default: 'Safe',
        enum: ['Safe', 'Suspicious', 'Phishing', 'Malware', 'Unknown']
    },
    threatDetails: {
        type: [String],
        default: []
    },
    verdict: {
        type: String,
        default: 'SAFE',
        enum: ['SAFE', 'SUSPICIOUS', 'DANGEROUS']
    },
    isQuarantined: {
        type: Boolean,
        default: false
    },
    scannedAt: {
        type: Date,
        default: Date.now
    }
},{timestamps:true});


const ShortUrlModel = mongoose.model("ShortUrl",ShortUrlSchema);

export default ShortUrlModel;