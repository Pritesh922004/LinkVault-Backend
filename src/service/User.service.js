import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET environment variable is missing.");
    }
    return secret;
};

const BCRYPT_ROUNDS = 12;

export const hash = async (password) => {
    try {
        return await bcrypt.hash(password, BCRYPT_ROUNDS);
    } catch (error) {
        console.error("Hashing Error:", error);
        throw new Error("Password hashing failed");
    }
};

export const ComparePassword = async (password, UserPassword) => {
    try {
        return await bcrypt.compare(password, UserPassword);
    } catch (error) {
        console.error("ComparePassword Error:", error);
        return false;
    }
};

export const CreateToken = async (id) => {
    try {
        return jwt.sign({ id }, getJwtSecret(), { expiresIn: '1d' });
    } catch (error) {
        console.error("CreateToken Error:", error);
        return null;
    }
};

export const VerifyToken = async (token) => {
    try {
        if (!token) return null;
        return jwt.verify(token, getJwtSecret());
    } catch (error) {
        if (error.name !== 'TokenExpiredError') {
            console.error("VerifyToken Error:", error.message);
        }
        return null;
    }
};
