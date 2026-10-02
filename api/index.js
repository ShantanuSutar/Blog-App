import express from "express";
import postRoutes from "./routes/posts.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import commentRoutes from "./routes/comment.js";
import bookmarkRoutes from "./routes/bookmarks.js";
import newsletterRoutes from "./routes/newsletter.js";
import healthRoutes from "./routes/health.js";
import reactionRoutes from "./routes/reactions.js";
import followRoutes from "./routes/follows.js";
import activityRoutes from "./routes/activity.js";
import uploadRoutes from "./routes/uploads.js";
import { schedulePostPublisher } from "./scheduler.js";
import cors from "cors";
import { jwtSecret } from "./middleware/auth.js";
import { config } from "./config.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";

jwtSecret();
const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

// Use cors middleware with explicit configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (config.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      const error = new Error('Not allowed by CORS');
      error.status = 403;
      callback(error);
    }
  },
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(`/api/auth`, authRoutes);
app.use(`/api/users`, userRoutes);
app.use(`/api/posts`, postRoutes);
app.use(`/api/comments`, commentRoutes);
app.use(`/api/bookmarks`, bookmarkRoutes);
app.use(`/api/newsletter`, newsletterRoutes);
app.use(`/api/health`, healthRoutes);
app.use(`/api/reactions`, reactionRoutes);
app.use(`/api/follows`, followRoutes);
app.use(`/api/activity`, activityRoutes);
app.use(`/api/upload`, uploadRoutes);

// Serve static files for locally stored avatars.
app.use("/api/uploads", express.static(path.join(currentDirectory, "uploads")));

app.get("/", (req, res) => {
  res.send("Hello to homepage");
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: "Invalid image upload" });
  }

  if (err.status === 403) {
    return res.status(403).json({ error: "Request origin is not allowed" });
  }

  console.error("Unhandled API error:", err);
  return res.status(500).json({ error: "Internal server error" });
});

let server;

const isEntrypoint = process.argv[1] && path.resolve(process.argv[1]) === currentFile;

if (isEntrypoint && process.env.VERCEL !== "1") {
  server = app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
    schedulePostPublisher();
  });
}

export { app, server };
export default app;
