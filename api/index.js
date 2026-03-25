import express from "express";
import postRoutes from "./routes/posts.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import commentRoutes from "./routes/comment.js";
import bookmarkRoutes from "./routes/bookmarks.js";
import newsletterRoutes from "./routes/newsletter.js";
import healthRoutes from "./routes/health.js";
import reactionRoutes from "./routes/reactions.js";
import { schedulePostPublisher } from "./scheduler.js";
import cookieParser from "cookie-parser";
import multer from "multer";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const port = process.env.PORT || 8800;

const app = express();

// IMPORTANT: cookieParser must be before routes
app.use(cookieParser());
app.use(express.json()); // to send json data to the server

// Use cors middleware with explicit configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie']
}));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "../client/public/upload");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + file.originalname);
  },
});
//UPLOAD IMAGE
const upload = multer({ storage });

app.post(`/api/upload`, upload.single("file"), function (req, res) {
  const file = req.file;
  res.status(200).json(file.filename);
});

app.use(`/api/auth`, authRoutes);
app.use(`/api/users`, userRoutes);
app.use(`/api/posts`, postRoutes);
app.use(`/api/comments`, commentRoutes);
app.use(`/api/bookmarks`, bookmarkRoutes);
app.use(`/api/newsletter`, newsletterRoutes);
app.use(`/api/health`, healthRoutes);
app.use(`/api/reactions`, reactionRoutes);

app.use("/", (req, res) => {
  res.send("Hello to homepage");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  
  // Initialize scheduled post publisher
  schedulePostPublisher();
});
