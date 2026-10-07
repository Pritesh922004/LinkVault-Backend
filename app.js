import express from "express";
import dotenv from "dotenv";
dotenv.config();
import cors from 'cors';
import { body, param } from "express-validator";
import User from "./src/Routes/User.routes.js";
import short_url from "./src/Routes/Short_Url.routes.js";
import adminRoutes from "./src/admin/admin.routes.js";
import aiRoutes from "./src/Routes/ai.routes.js";
import ConnectDB from "./src/config/Connectdb.js";
import { RedirectToUrl } from "./src/controllers/CreateShortUrl.controller.js";
import { CheckUserId } from "./src/middleware/Add_User.js";
import cookieParser from "cookie-parser";
import { DeleteUrls } from "./src/controllers/DeleteUrl.controller.js";
import morgan from "morgan";


const app = express();
app.set('trust proxy', 1);
const port = process.env.PORT || 3000;
app.use(morgan('dev'));


const allowedOrigins = [
    "https://shorturl-priteshs-projects-702bd372.vercel.app",
    "https://shorturl-git-main-priteshs-projects-702bd372.vercel.app",
    "https://short-url-frontend-omega.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    
];

if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
}

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(null, true); // Alternatively allow all in CORS or whitelist
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});

app.use(CheckUserId);
app.get('/', (req, res) => {
    res.send("Hello World");
})
app.use("/ShortUrl", short_url);
app.use('/user', User);
app.use('/admin', adminRoutes);
app.use('/api/ai', aiRoutes);


app.get('/:id',
    param('id')
        .notEmpty().withMessage("ShortUrlID is Missing In ShortUrl")
        .isString().withMessage("Invalid ShortUrl")
        .trim()
    , RedirectToUrl);
app.post('/delete',
    body('id')
        .notEmpty().withMessage("ShortUrlID is Missing In ShortUrl")
        .trim()
    , DeleteUrls);

// 404 Catch-All Handler for Unmatched Backend Routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        statusCode: 404,
        error: "Route Not Found",
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
});

await ConnectDB();

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
