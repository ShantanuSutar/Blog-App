import dotenv from "dotenv";

dotenv.config();

const buildConnectionString = () => {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("uselibpqcompat");
    return url.toString();
  }

  const url = new URL("postgresql://localhost");
  url.username = process.env.POSTGRES_USER || "";
  url.password = process.env.POSTGRES_PASSWORD || "";
  url.hostname = process.env.POSTGRES_HOST || "localhost";
  url.port = process.env.POSTGRES_PORT || "5432";
  url.pathname = `/${process.env.POSTGRES_DB || "postgres"}`;
  return url.toString();
};

const smtpPort = Number(process.env.SMTP_PORT) || 587;

export const config = Object.freeze({
  isProduction: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT) || 8800,
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
    : ["http://localhost:5173", "http://localhost:5174"],
  database: Object.freeze({
    connectionString: buildConnectionString(),
    ssl: process.env.POSTGRES_SSL === "disable"
      ? false
      : { rejectUnauthorized: process.env.POSTGRES_SSL === "verify-full" },
  }),
  email: Object.freeze({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: smtpPort,
    secure: smtpPort === 465,
    user: process.env.SMTP_USER || "",
    password: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "",
  }),
  frontendUrl: process.env.FRONTEND_URL || "https://unsaid-stories-and-more.vercel.app",
  apiPublicUrl: process.env.API_PUBLIC_URL || `http://localhost:${Number(process.env.PORT) || 8800}`,
});
