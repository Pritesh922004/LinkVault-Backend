import TokenModel from "../models/token.js";

export const BlockedToken = async (token, user)=>{
    try {
        if (!token) return null;
        return await TokenModel.create({ token, user });
    } catch (error) {
        console.error("BlockedToken Error:", error);
        return null;
    }
}

export const verifyBlockedToken = async (token)=>{
    try {
        if (!token) return null;
        return await TokenModel.findOne({ token });
    } catch (error) {
        console.error("verifyBlockedToken Error:", error);
        return null;
    }
}