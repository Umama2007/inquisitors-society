import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { env } from "./config/env";
import { pool } from "./config/db";

import authRoutes from "./routes/authRoutes";
import eventRoutes from "./routes/eventRoutes";
import internshipRoutes from "./routes/internshipRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import chatbotRoutes from "./routes/chatbotRoutes";
import uploadRoutes from "./routes/uploadRoutes";

const app = express();

// Security
app.use(helmet({ contentSecurityPolicy: false }));

// CORS
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

// Health check
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(503).json({ status: "error", database: "disconnected" });
  }
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/internships", internshipRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/uploads", uploadRoutes);

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start server
app.listen(env.PORT, () => {
  console.log(`\n  ✅ Backend running on http://localhost:${env.PORT}`);
  console.log(`  📡 API: http://localhost:${env.PORT}/api`);
  console.log(`  🔗 CORS: ${env.FRONTEND_URL}\n`);
});

export default app;
