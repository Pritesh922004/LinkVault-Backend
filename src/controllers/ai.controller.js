import { GoogleGenAI } from '@google/genai';
import { PDFParse } from 'pdf-parse';

// Helper for extracting text from PDF buffer
const extractTextFromPdf = async (buffer) => {
    try {
        const uint8Data = new Uint8Array(buffer);
        const parser = new PDFParse(uint8Data);
        await parser.load();
        const textResult = await parser.getText();
        return typeof textResult === 'string' ? textResult : (textResult?.text || '');
    } catch (err) {
        console.warn("PDF parse warning/fallback:", err.message);
        return buffer.toString('utf-8');
    }
};

// Initialize Gemini Client
const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.startsWith('CHANGE_ME')) {
        throw new Error("GEMINI_API_KEY is not configured or still has placeholder value in .env file.");
    }
    return new GoogleGenAI({ apiKey });
};

// Resilient model fallback execution
const generateContentWithFallback = async (ai, prompt) => {
    const modelsToTry = [
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.8-flash',
        'gemini-flash-latest'
    ];

    let lastError = null;
    for (const model of modelsToTry) {
        try {
            const response = await ai.models.generateContent({
                model,
                contents: prompt,
            });
            if (response && response.text) {
                return response.text;
            }
        } catch (err) {
            console.warn(`Model ${model} failed, trying next model... Error: ${err.message}`);
            lastError = err;
        }
    }
    throw lastError || new Error("Failed to generate content with available Gemini models.");
};

/**
 * Controller for AI Code Review
 */
export const reviewCode = async (req, res) => {
    try {
        const { code, language = 'javascript', instruction = '' } = req.body;

        if (!code || typeof code !== 'string' || !code.trim()) {
            return res.status(400).json({
                success: false,
                message: "Please provide valid source code for review."
            });
        }

        if (code.length > 50000) {
            return res.status(400).json({
                success: false,
                message: "Source code exceeds the maximum allowed length of 50,000 characters."
            });
        }

        // Sanitize language and instruction to prevent prompt injection
        const cleanLanguage = (typeof language === 'string'
            ? language.replace(/[^a-zA-Z0-9#+.-]/g, '').slice(0, 30)
            : 'javascript') || 'javascript';

        const cleanInstruction = (typeof instruction === 'string'
            ? instruction.slice(0, 500).replace(/[`\\]/g, '')
            : '').trim();

        let ai;
        try {
            ai = getAiClient();
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        const systemPrompt = `You are an expert senior code reviewer and software architect.
Analyze the following ${cleanLanguage} code carefully.
Provide feedback structured clearly in clean Markdown format with the following sections:

1. **Overall Quality Score**: Provide a rating out of 100 (e.g. 85/100) with a quick 1-line verdict.
2. **Key Strengths**: Highlight what is done well.
3. **Bugs & Security Risks**: Identify edge cases, memory leaks, potential crashes, or security vulnerabilities (if any).
4. **Performance & Optimization**: Suggest improvements for speed, memory, or clean code practices.
5. **Refactored Code**: Provide a complete, clean, optimized version of the code block.

${cleanInstruction ? `User's specific focus instruction: "${cleanInstruction}"` : ''}`;

        const userPrompt = `Language: ${cleanLanguage}\n\nCode to review:\n\`\`\`${cleanLanguage}\n${code}\n\`\`\``;

        const reviewResult = await generateContentWithFallback(ai, `${systemPrompt}\n\n${userPrompt}`);

        return res.status(200).json({
            success: true,
            language: cleanLanguage,
            review: reviewResult
        });

    } catch (error) {
        console.error("AI Code Review Error:", error.message);
        return res.status(500).json({
            success: false,
            message: process.env.NODE_ENV === 'production'
                ? "Failed to generate AI code review. Please try again later."
                : (error.message || "Failed to generate AI code review.")
        });
    }
};

/**
 * Controller for AI Document / Text Translation
 */
export const translateDoc = async (req, res) => {
    try {
        const { targetLanguage = 'English', text: rawTextInput } = req.body;
        let contentToTranslate = '';
        let originalFilename = null;

        if (req.file) {
            originalFilename = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
            const mimeType = req.file.mimetype;

            if (mimeType === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf')) {
                contentToTranslate = await extractTextFromPdf(req.file.buffer);
            } else {
                contentToTranslate = req.file.buffer.toString('utf-8');
            }
        } else if (rawTextInput && typeof rawTextInput === 'string') {
            contentToTranslate = rawTextInput;
        }

        if (!contentToTranslate || !contentToTranslate.trim()) {
            return res.status(400).json({
                success: false,
                message: "No document file or text content provided for translation."
            });
        }

        // Limit translation length to prevent abuse / resource exhaustion
        if (contentToTranslate.length > 30000) {
            contentToTranslate = contentToTranslate.substring(0, 30000) + "\n\n[Content truncated for length limit]";
        }

        const cleanTargetLang = (typeof targetLanguage === 'string'
            ? targetLanguage.replace(/[^a-zA-Z0-9 -]/g, '').slice(0, 50)
            : 'English') || 'English';

        let ai;
        try {
            ai = getAiClient();
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        const prompt = `You are a professional translator and linguist.
Translate the following text accurately into ${cleanTargetLang}.
Maintain original formatting, structure, paragraphs, headings, bullet points, and tone.
Do not add conversational fluff or commentary outside the translated text unless necessary for context.

Text to translate:
---
${contentToTranslate}
---`;

        const translatedText = await generateContentWithFallback(ai, prompt);

        return res.status(200).json({
            success: true,
            targetLanguage: cleanTargetLang,
            filename: originalFilename,
            originalText: contentToTranslate,
            translatedText
        });

    } catch (error) {
        console.error("AI Document Translation Error:", error.message);
        return res.status(500).json({
            success: false,
            message: process.env.NODE_ENV === 'production'
                ? "Failed to translate document. Please try again later."
                : (error.message || "Failed to translate document.")
        });
    }
};
