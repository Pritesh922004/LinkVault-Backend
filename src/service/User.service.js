import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import TokenModel from '../models/token.js';


export const hash = async (password)=>{
    try {
        return await bcrypt.hash(password, 10);
    } catch (error) {
        console.error("Hashing Error:", error);
        return null;
    }
}

export const ComparePassword = async (password, UserPassword)=>{
    try {
        return await bcrypt.compare(password, UserPassword);
    } catch (error) {
        console.error("ComparePassword Error:", error);
        return null;
    }
}

export const CreateToken = async (id)=>{
    try {
        return await jwt.sign({id}, process.env.JWT_SECRET, { expiresIn: '1d' });
    } catch (error) {
        console.error("CreateToken Error:", error);
        return null;
    }
}

export const VerifyToken = async (token)=>{
    try {
        if (!token) return null;
        return await jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        console.error("VerifyToken Error:", error);
        return null;
    }
}

