import express from 'express';
import multer from 'multer';
import { reviewCode, translateDoc } from '../controllers/ai.controller.js';

const router = express.Router();

// Configure Multer for in-memory file parsing (limit: 10MB)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

// Route 1: Code Review
router.post('/code-review', reviewCode);

// Route 2: Document / PDF Translation (supports file upload field 'document' or raw text body)
router.post('/translate-doc', upload.single('document'), translateDoc);

export default router;
