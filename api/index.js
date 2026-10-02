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
import { assertAuthConfiguration } from "./security/auth.js";
import { config } from "./config.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import {
  apiLimiter,
  corsOptions,
  requireSupportedContentType,
  securityHeaders,
} from "./middleware/security.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

assertAuthConfiguration();
const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const app = express();

app.disable("x-powered-by");
app.set("query parser", "simple");
if (config.security.trustProxy !== false) {
  app.set("trust proxy", config.security.trustProxy);
}
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(requireSupportedContentType);
app.use(express.json({
  limit: config.security.jsonBodyLimit,
  strict: true,
  type: ["application/json", "application/*+json"],
}));
app.use("/api", apiLimiter);

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

app.use(notFoundHandler);
app.use(errorHandler);

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
