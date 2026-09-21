import { db } from "./db.js";
import { runMigrations } from "./migrate.js";

try {
  const appliedMigrations = await runMigrations();

  if (appliedMigrations.length === 0) {
    console.log("Database schema is already up to date.");
  } else {
    console.log(`Applied ${appliedMigrations.length} migration(s):`);
    appliedMigrations.forEach((migration) => console.log(`- ${migration}`));
  }
} catch (error) {
  console.error(error.message);
  if (error.cause) console.error(error.cause);
  process.exitCode = 1;
} finally {
  await db.end();
}
