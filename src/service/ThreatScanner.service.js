import { GoogleGenAI } from '@google/genai';

// Major brands frequently targeted by phishing campaigns
const MONITORED_BRANDS = [
    { name: 'PayPal', pattern: /paypal/i, legitimateHosts: ['paypal.com'] },
    { name: 'Google', pattern: /google|gmail/i, legitimateHosts: ['google.com', 'accounts.google.com', 'gmail.com'] },
    { name: 'Apple', pattern: /apple|icloud/i, legitimateHosts: ['apple.com', 'icloud.com'] },
    { name: 'Microsoft', pattern: /microsoft|outlook|office365|live/i, legitimateHosts: ['microsoft.com', 'live.com', 'office.com', 'outlook.com'] },
    { name: 'Amazon', pattern: /amazon|prime/i, legitimateHosts: ['amazon.com', 'amazon.in'] },
    { name: 'Netflix', pattern: /netflix/i, legitimateHosts: ['netflix.com'] },
    { name: 'Meta / Instagram', pattern: /instagram|facebook|whatsapp/i, legitimateHosts: ['instagram.com', 'facebook.com', 'whatsapp.com'] },
    { name: 'Crypto / Web3', pattern: /metamask|binance|coinbase|trustwallet/i, legitimateHosts: ['binance.com', 'coinbase.com', 'metamask.io'] },
    { name: 'Banking', pattern: /chase|wellsfargo|bankofamerica|citi|hdfc|sbi|icici/i, legitimateHosts: ['chase.com', 'wellsfargo.com', 'bankofamerica.com', 'hdfcbank.com', 'onlinesbi.sbi', 'icicibank.com'] }
];

// TLDs with historically high abuse / spam ratios
const SUSPICIOUS_TLDS = new Set([
    'xyz', 'top', 'click', 'link', 'stream', 'gq', 'cf', 'tk', 'ml', 'ga',
    'ru', 'cc', 'buzz', 'fit', 'work', 'date', 'racing', 'download', 'support'
]);

// Phishing trigger keywords in paths or subdomains
const SUSPICIOUS_KEYWORDS = [
    'login', 'signin', 'verify', 'verification', 'secure-account', 'update-card',
    'banking', 'password-reset', 'confirm-identity', 'claim-reward', 'airdrop',
    'wallet-connect', 'billing-problem', 'suspended-account', 'security-alert'
];

/**
 * Fast deterministic heuristic scanner
 * Returns { score: number, flags: string[], brandTargeted: string | null }
 */
export const runHeuristicAnalysis = (targetUrl) => {
    let score = 0;
    const flags = [];
    let brandTargeted = null;

    try {
        const parsed = new URL(targetUrl);
        const hostname = parsed.hostname.toLowerCase();
        const fullUrl = targetUrl.toLowerCase();
        const pathname = parsed.pathname.toLowerCase();

        // 1. Check protocol security
        if (parsed.protocol === 'http:') {
            score += 20;
            flags.push("Insecure HTTP protocol (lacks SSL/TLS encryption)");
        } else if (parsed.protocol === 'https:') {
            flags.push("HTTPS encrypted connection detected");
        }

        // 2. IP-based host detection (e.g. http://192.168.1.1/login)
        const isIpHost = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.startsWith('[') || hostname.endsWith(']');
        if (isIpHost) {
            score += 45;
            flags.push("Direct IP address used as destination host (common in botnets & malware)");
        }

        // 3. High-risk / suspicious TLD check
        const hostParts = hostname.split('.');
        const tld = hostParts[hostParts.length - 1];
        if (SUSPICIOUS_TLDS.has(tld)) {
            score += 25;
            flags.push(`High-risk Top-Level Domain (TLD) detected (.${tld})`);
        }

        // 4. Brand Impersonation / Typosquatting Check
        for (const brand of MONITORED_BRANDS) {
            if (brand.pattern.test(fullUrl)) {
                const isLegitimate = brand.legitimateHosts.some(lh => hostname === lh || hostname.endsWith('.' + lh));
                if (!isLegitimate) {
                    score += 55;
                    brandTargeted = brand.name;
                    flags.push(`High Alert: Domain or path impersonates ${brand.name} but does not resolve to the official ${brand.name} domain`);
                    break;
                }
            }
        }

        // 5. Keyword risk detection
        let keywordMatches = 0;
        for (const kw of SUSPICIOUS_KEYWORDS) {
            if (pathname.includes(kw) || parsed.search.includes(kw)) {
                keywordMatches++;
            }
        }
        if (keywordMatches > 0) {
            const addScore = Math.min(keywordMatches * 15, 30);
            score += addScore;
            flags.push(`Deceptive action keywords detected in URL path (${keywordMatches} matches)`);
        }

        // 6. Excessive subdomains (e.g. secure.login.paypal.verify.attacker.com)
        if (hostParts.length >= 4 && !hostname.endsWith('.co.uk') && !hostname.endsWith('.co.in')) {
            score += 15;
            flags.push("Excessive subdomain depth (obfuscation tactic)");
        }

        // 7. Open redirect chaining parameters
        const search = parsed.search.toLowerCase();
        if (/(\?|&)(url|redirect|next|dest|destination|forward)=http/i.test(search)) {
            score += 20;
            flags.push("Potential open-redirect chain detected in query parameters");
        }

    } catch (err) {
        score += 30;
        flags.push("Malformed or irregular URL structure");
    }

    return {
        score: Math.min(Math.max(score, 0), 100),
        flags,
        brandTargeted
    };
};

/**
 * AI Contextual Threat Classifier using Google Gemini
 */
export const runAiThreatClassification = async (targetUrl, heuristicResults) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.startsWith('CHANGE_ME')) {
        return null;
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `You are an elite Cybersecurity Threat Analyst evaluating a URL for potential phishing, credential harvesting, malware delivery, or deceptive practices.

Target URL: "${targetUrl}"
Initial Heuristics Flags:
${heuristicResults.flags.map(f => `- ${f}`).join('\n')}
Deterministic Heuristic Score: ${heuristicResults.score}/100

Perform a structured security evaluation. Return ONLY a valid JSON object with no markdown formatting and no extra text:
{
  "threatScore": <number between 0 and 100>,
  "threatCategory": <"Safe" | "Suspicious" | "Phishing" | "Malware">,
  "verdict": <"SAFE" | "SUSPICIOUS" | "DANGEROUS">,
  "reasons": [<2-4 concise, professional bullet points explaining your assessment>]
}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const rawText = response.text ? response.text.trim() : '';
        const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
        const parsed = JSON.parse(cleaned);

        return {
            threatScore: typeof parsed.threatScore === 'number' ? Math.min(Math.max(parsed.threatScore, 0), 100) : heuristicResults.score,
            threatCategory: ['Safe', 'Suspicious', 'Phishing', 'Malware'].includes(parsed.threatCategory) ? parsed.threatCategory : 'Safe',
            verdict: ['SAFE', 'SUSPICIOUS', 'DANGEROUS'].includes(parsed.verdict) ? parsed.verdict : 'SAFE',
            reasons: Array.isArray(parsed.reasons) ? parsed.reasons : heuristicResults.flags
        };
    } catch (err) {
        console.warn("AI threat classification fallback to heuristics:", err.message);
        return null;
    }
};

/**
 * Comprehensive Hybrid Threat Scan
 * Combines fast deterministic heuristics with AI evaluation
 */
export const scanUrlThreat = async (targetUrl) => {
    const heuristics = runHeuristicAnalysis(targetUrl);
    
    // Run AI classification if API key is present
    const aiResult = await runAiThreatClassification(targetUrl, heuristics);

    let threatScore = heuristics.score;
    let threatCategory = 'Safe';
    let verdict = 'SAFE';
    let threatDetails = heuristics.flags;

    if (aiResult) {
        // Blend heuristic and AI scores for maximum accuracy
        threatScore = Math.max(heuristics.score, aiResult.threatScore);
        threatCategory = aiResult.threatCategory;
        verdict = aiResult.verdict;
        threatDetails = Array.from(new Set([...heuristics.flags, ...aiResult.reasons]));
    } else {
        // Classify based on heuristic score
        if (threatScore >= 65) {
            threatCategory = heuristics.brandTargeted ? 'Phishing' : 'Suspicious';
            verdict = 'DANGEROUS';
        } else if (threatScore >= 30) {
            threatCategory = 'Suspicious';
            verdict = 'SUSPICIOUS';
        } else {
            threatCategory = 'Safe';
            verdict = 'SAFE';
            if (threatDetails.length === 0) {
                threatDetails = ["Verified legitimate destination format", "No malicious patterns identified"];
            }
        }
    }

    const isQuarantined = threatScore >= 65;

    return {
        threatScore,
        threatCategory,
        verdict,
        isQuarantined,
        threatDetails,
        scannedAt: new Date()
    };
};
