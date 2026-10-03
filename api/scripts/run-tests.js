import { spawn } from "node:child_process";
import { access, mkdir, readdir, rm } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

const { Pool } = pg;
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const apiDirectory = path.resolve(currentDirectory, "..");
const testDirectory = path.join(apiDirectory, "test");

dotenv.config({ path: path.join(apiDirectory, ".env") });

const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const generatedSchema = `unsaid_test_${process.pid}_${Date.now().toString(36)}`;
const coverageEnabled = process.argv.includes("--coverage");
const temporaryPostgresDirectory = path.join(apiDirectory, ".test-postgres", generatedSchema);

const quoteIdentifier = (identifier) => `"${identifier.replaceAll('"', '""')}"`;

const buildConfiguredDatabaseUrl = () => {
  if (process.env.DATABASE_URL?.trim()) {
    return new URL(process.env.DATABASE_URL.trim());
  }

  const url = new URL("postgresql://localhost");
  url.username = process.env.POSTGRES_USER || "";
  url.password = process.env.POSTGRES_PASSWORD || "";
  url.hostname = process.env.POSTGRES_HOST || "localhost";
  url.port = process.env.POSTGRES_PORT || "5432";
  url.pathname = `/${process.env.POSTGRES_DB || "postgres"}`;
  return url;
};

const resolveConfiguredTestDatabase = () => {
  if ((process.env.NODE_ENV || "").trim().toLowerCase() === "production") {
    throw new Error("Refusing to run tests while NODE_ENV=production");
  }

  const explicitUrl = process.env.TEST_DATABASE_URL?.trim();
  const databaseUrl = explicitUrl ? new URL(explicitUrl) : buildConfiguredDatabaseUrl();
  if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol)) {
    throw new Error("The test database must use a PostgreSQL connection URL");
  }

  const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\//, ""));
  if (explicitUrl) {
    if (!databaseName.toLowerCase().includes("test")) {
      throw new Error("TEST_DATABASE_URL must name a database containing 'test'");
    }
  } else if (!localHosts.has(databaseUrl.hostname.toLowerCase())) {
    return null;
  }

  databaseUrl.searchParams.delete("options");
  return databaseUrl;
};

const sslConfiguration = () => {
  const mode = (process.env.POSTGRES_SSL || "require").trim().toLowerCase();
  if (mode === "disable") return false;
  return { rejectUnauthorized: mode === "verify-full" };
};

const run = (args, environment) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, args, {
    cwd: apiDirectory,
    env: environment,
    stdio: "inherit",
    shell: false,
  });
  child.once("error", reject);
  child.once("exit", (code, signal) => {
    if (code === 0) resolve();
    else reject(new Error(`Test command failed (${signal || `exit ${code}`})`));
  });
});

const runExecutable = (command, args, { quiet = false } = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    cwd: apiDirectory,
    env: process.env,
    stdio: quiet ? "ignore" : "inherit",
    shell: false,
  });
  child.once("error", reject);
  child.once("exit", (code, signal) => {
    if (code === 0) resolve();
    else reject(new Error(`${path.basename(command)} failed (${signal || `exit ${code}`})`));
  });
});

const findPostgresBinaryDirectory = async () => {
  if (process.env.POSTGRES_BIN?.trim()) {
    const configured = path.resolve(process.env.POSTGRES_BIN.trim());
    await access(path.join(configured, process.platform === "win32" ? "initdb.exe" : "initdb"));
    return configured;
  }

  if (process.platform === "win32") {
    const postgresRoot = path.join(process.env.ProgramFiles || "C:\\Program Files", "PostgreSQL");
    try {
      const versions = (await readdir(postgresRoot, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
      for (const version of versions) {
        const binaryDirectory = path.join(postgresRoot, version, "bin");
        try {
          await access(path.join(binaryDirectory, "initdb.exe"));
          await access(path.join(binaryDirectory, "pg_ctl.exe"));
          return binaryDirectory;
        } catch {
          // Continue looking for another installed PostgreSQL version.
        }
      }
    } catch {
      return null;
    }
    return null;
  }

  return "";
};

const getAvailablePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const { port } = server.address();
    server.close((error) => (error ? reject(error) : resolve(port)));
  });
});

const startTemporaryPostgres = async () => {
  const binaryDirectory = await findPostgresBinaryDirectory();
  const executable = (name) => binaryDirectory === null
    ? null
    : path.join(binaryDirectory, process.platform === "win32" ? `${name}.exe` : name);
  const initdb = executable("initdb");
  const pgCtl = executable("pg_ctl");
  if (!initdb || !pgCtl) {
    throw new Error(
      "The configured database is non-local. Set TEST_DATABASE_URL to a dedicated test database or install PostgreSQL locally.",
    );
  }

  const dataDirectory = path.join(temporaryPostgresDirectory, "data");
  const logFile = path.join(temporaryPostgresDirectory, "postgres.log");
  try {
    await mkdir(temporaryPostgresDirectory, { recursive: true });
    await runExecutable(initdb, [
      "-D", dataDirectory,
      "-U", "postgres",
      "--auth-local=trust",
      "--auth-host=trust",
      "--encoding=UTF8",
      "--no-locale",
    ], { quiet: true });

    let lastStartError;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const port = await getAvailablePort();
      try {
        await runExecutable(pgCtl, [
          "-D", dataDirectory,
          "-l", logFile,
          "-o", `-p ${port} -h 127.0.0.1`,
          "-w",
          "start",
        ], { quiet: attempt < 3 });

        return {
          url: new URL(`postgresql://postgres@127.0.0.1:${port}/postgres`),
          ssl: false,
          async stop() {
            await runExecutable(pgCtl, ["-D", dataDirectory, "-m", "fast", "-w", "stop"], {
              quiet: true,
            });
          },
        };
      } catch (error) {
        lastStartError = error;
      }
    }
    throw lastStartError;
  } catch (error) {
    await rm(temporaryPostgresDirectory, { recursive: true, force: true });
    throw error;
  }
};

const collectTestFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTestFiles(entryPath);
    return entry.isFile() && entry.name.endsWith(".test.js") ? [entryPath] : [];
  }));
  return nested.flat().sort();
};

const configuredTestDatabaseUrl = resolveConfiguredTestDatabase();
const temporaryPostgres = configuredTestDatabaseUrl ? null : await startTemporaryPostgres();
const baseDatabaseUrl = configuredTestDatabaseUrl || temporaryPostgres.url;
const administrationPool = new Pool({
  connectionString: baseDatabaseUrl.toString(),
  ssl: temporaryPostgres ? temporaryPostgres.ssl : sslConfiguration(),
  max: 1,
  application_name: "unsaid-test-bootstrap",
});

const isolatedDatabaseUrl = new URL(baseDatabaseUrl);
isolatedDatabaseUrl.searchParams.set("options", `-csearch_path=${generatedSchema}`);
const testUploadsDirectory = path.join(apiDirectory, ".test-uploads", generatedSchema);
const childEnvironment = {
  ...process.env,
  NODE_ENV: "test",
  DATABASE_URL: isolatedDatabaseUrl.toString(),
  TEST_DATABASE_SCHEMA: generatedSchema,
  JWT_SECRET: "unsaid-integration-test-secret-with-more-than-32-bytes",
  JWT_EXPIRES_IN: "1h",
  BCRYPT_ROUNDS: "10",
  POSTGRES_SSL: temporaryPostgres ? "disable" : process.env.POSTGRES_SSL || "disable",
  // Keep the normal development-level logger behavior so logging tests exercise
  // real request completion events. Test logs never include request bodies.
  LOG_LEVEL: "debug",
  API_RATE_LIMIT_MAX: "100000",
  LOGIN_RATE_LIMIT_MAX: "100000",
  REGISTER_RATE_LIMIT_MAX: "100000",
  INTERACTION_RATE_LIMIT_MAX: "100000",
  COMMENT_RATE_LIMIT_MAX: "100000",
  NEWSLETTER_RATE_LIMIT_MAX: "100000",
  UPLOAD_RATE_LIMIT_MAX: "100000",
  UPLOAD_LOCAL_DIRECTORY: testUploadsDirectory,
  SMTP_USER: "",
  SMTP_PASS: "",
  SMTP_FROM_EMAIL: "",
};

let schemaCreated = false;
let exitCode = 0;
try {
  await administrationPool.query(`CREATE SCHEMA ${quoteIdentifier(generatedSchema)}`);
  schemaCreated = true;

  await run(["setup_db.js"], childEnvironment);
  const testFiles = await collectTestFiles(testDirectory);
  if (testFiles.length === 0) throw new Error("No test files were found");

  const testArguments = ["--test", "--test-concurrency=1"];
  if (coverageEnabled) {
    testArguments.push(
      "--experimental-test-coverage",
      "--test-coverage-exclude=test/**",
      "--test-coverage-exclude=scripts/**",
    );
  }
  testArguments.push(...testFiles);
  await run(testArguments, childEnvironment);
} catch (error) {
  exitCode = 1;
  console.error(error.message);
} finally {
  if (schemaCreated) {
    try {
      await administrationPool.query(`DROP SCHEMA ${quoteIdentifier(generatedSchema)} CASCADE`);
    } catch (error) {
      exitCode = 1;
      console.error("Unable to remove the temporary test schema:", error.message);
    }
  }
  await administrationPool.end();
  if (temporaryPostgres) {
    try {
      await temporaryPostgres.stop();
    } catch (error) {
      exitCode = 1;
      console.error("Unable to stop the temporary PostgreSQL server:", error.message);
    }
  }
  await rm(testUploadsDirectory, { recursive: true, force: true });
  await rm(temporaryPostgresDirectory, { recursive: true, force: true });
}

process.exitCode = exitCode;
