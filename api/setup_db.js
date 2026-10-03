import { db } from "./db.js";
import { runMigrations } from "./migrate.js";
import { logger } from "./utils/logger.js";

try {
  const appliedMigrations = await runMigrations();

  if (appliedMigrations.length === 0) {
    logger.info("Database schema is already up to date");
  } else {
    logger.info("Database migrations applied", {
      count: appliedMigrations.length,
      migrations: appliedMigrations,
    });
  }
} catch (error) {
  logger.error("Database migration failed", { error });
  process.exitCode = 1;
} finally {
  await db.end();
}
