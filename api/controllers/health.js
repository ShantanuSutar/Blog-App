import { db } from "../db.js";

export const checkHealth = async (req, res) => {
  try {
    await db.query("SELECT 1");
    return res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    console.error("Health check failed:", error.message);
    return res.status(503).json({ status: "unhealthy" });
  }
};

export const ping = (req, res) =>
  res.status(200).json({
    message: "pong",
    timestamp: new Date().toISOString(),
  });
