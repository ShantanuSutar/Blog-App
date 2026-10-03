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
import { schedulePostPublisher, stopPostPublisher } from "./scheduler.js";
import cors from "cors";
import { assertAuthConfiguration } from "./security/auth.js";
import { config } from "./config.js";
import { checkDatabaseConnection, closeDatabase } from "./db.js";
import { checkHealth } from "./controllers/health.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { requestLogger } from "./middleware/requestLogger.js";
import {
  apiLimiter,
  corsOptions,
  requireSupportedContentType,
  securityHeaders,
} from "./middleware/security.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mediaRootDirectory } from "./services/mediaStorage.js";
import { closeEmailTransport } from "./utils/email.js";
import { logger } from "./utils/logger.js";

assertAuthConfiguration();
const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const app = express();

app.disable("x-powered-by");
app.set("query parser", "simple");
if (config.security.trustProxy !== false) {
  app.set("trust proxy", config.security.trustProxy);
}
app.use(requestLogger);
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
app.get("/health", checkHealth);

// Uploaded references are API-relative and never expose the backing directory.
app.use("/api/uploads", express.static(mediaRootDirectory, {
  dotfiles: "deny",
  index: false,
  redirect: false,
  maxAge: "1y",
  immutable: true,
  setHeaders(response) {
    response.setHeader("X-Content-Type-Options", "nosniff");
  },
}));

app.get("/", (req, res) => {
  res.send("Hello to homepage");
});

app.use(notFoundHandler);
app.use(errorHandler);

let server;
let shutdownPromise;

const isEntrypoint = process.argv[1] && path.resolve(process.argv[1]) === currentFile;

const closeHttpServer = async () => {
  if (!server) return;

  const activeServer = server;
  server = undefined;
  await new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve();
    };
    const timeout = setTimeout(() => {
      logger.warn("HTTP shutdown deadline reached; closing active connections");
      activeServer.closeAllConnections?.();
      finish();
    }, config.shutdownTimeoutMillis);
    timeout.unref();

    activeServer.close((error) => {
      clearTimeout(timeout);
      finish(error);
    });
    activeServer.closeIdleConnections?.();
  });
};

export const startServer = async () => {
  if (server) return server;

  await checkDatabaseConnection();
  logger.info("Database connection verified");

  const instance = app.listen(config.port);
  server = instance;
  try {
    await new Promise((resolve, reject) => {
      const onError = (error) => {
        instance.off("listening", onListening);
        reject(error);
      };
      const onListening = () => {
        instance.off("error", onError);
        resolve();
      };
      instance.once("error", onError);
      instance.once("listening", onListening);
    });
  } catch (error) {
    server = undefined;
    throw error;
  }
  instance.on("error", (error) => {
    logger.error("HTTP server error", { error });
  });

  schedulePostPublisher();
  logger.info("HTTP server started", {
    port: config.port,
    environment: config.environment,
  });

  if (config.isProduction && config.uploads.storageDriver === "local") {
    logger.warn("Local upload storage is enabled in production; files require persistent shared storage");
  }

  return instance;
};

export const shutdownServer = async ({ reason = "shutdown", exitCode = 0 } = {}) => {
  if (shutdownPromise) return shutdownPromise;

  shutdownPromise = (async () => {
    logger.info("Application shutdown started", { reason });
    process.exitCode = exitCode;

    const httpShutdown = closeHttpServer().catch((error) => {
      process.exitCode = 1;
      logger.error("HTTP server shutdown failed", { error });
    });

    try {
      await stopPostPublisher();
    } catch (error) {
      process.exitCode = 1;
      logger.error("Scheduler shutdown failed", { error });
    }

    await httpShutdown;

    try {
      closeEmailTransport();
    } catch (error) {
      process.exitCode = 1;
      logger.error("Email transport shutdown failed", { error });
    }

    try {
      await closeDatabase();
    } catch (error) {
      process.exitCode = 1;
      logger.error("Database shutdown failed", { error });
    }

    logger.info("Application shutdown completed", { exitCode: process.exitCode || 0 });
  })();

  return shutdownPromise;
};

const installProcessHandlers = () => {
  for (const signal of ["SIGTERM", "SIGINT"]) {
    process.once(signal, () => {
      shutdownServer({ reason: signal }).catch((error) => {
        logger.error("Graceful shutdown failed", { error });
        process.exitCode = 1;
      });
    });
  }

  process.once("uncaughtException", (error) => {
    logger.error("Uncaught process exception", { error });
    shutdownServer({ reason: "uncaughtException", exitCode: 1 })
      .finally(() => process.exit(1));
  });

  process.once("unhandledRejection", (reason) => {
    const error = reason instanceof Error ? reason : new Error("Unhandled promise rejection");
    logger.error("Unhandled promise rejection", { error });
    shutdownServer({ reason: "unhandledRejection", exitCode: 1 })
      .finally(() => process.exit(1));
  });
};

if (isEntrypoint && process.env.VERCEL !== "1") {
  installProcessHandlers();
  startServer().catch((error) => {
    logger.error("Application startup failed", { error });
    shutdownServer({ reason: "startupFailure", exitCode: 1 })
      .finally(() => process.exit(1));
  });
}

export { app, server };
export default app;
