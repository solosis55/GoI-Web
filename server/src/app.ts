import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/authRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import postsRoutes from "./routes/postsRoutes.js";
import workoutSessionsRoutes from "./routes/workoutSessionsRoutes.js";
import workoutsRoutes from "./routes/workoutsRoutes.js";
import { initializeStore } from "./services/store.js";

dotenv.config();

const app = express();
initializeStore();

const moduleDir = dirname(fileURLToPath(import.meta.url));
const clientDist = resolve(moduleDir, "../../dist");
const serveProductionClient =
  process.env.NODE_ENV === "production" && existsSync(join(clientDist, "index.html"));

app.use(cors());
app.use(express.json());

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: "AUTH_RATE_LIMITED",
    message: "too many auth attempts, try again later",
  },
});

if (!serveProductionClient) {
  app.get("/", (_req, res) => {
    res.json({
      message: "Backend running",
      docs: {
        health: "/api/health",
        auth: "/api/auth",
        workouts: "/api/workouts",
        workoutSessions: "/api/workout-sessions",
        posts: "/api/posts",
      },
    });
  });
}

app.use("/api/health", healthRoutes);
app.use("/api/auth/login", authRateLimiter);
app.use("/api/auth/register", authRateLimiter);
app.use("/api/auth/forgot-password", authRateLimiter);
app.use("/api/auth/reset-password", authRateLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/workouts", workoutsRoutes);
app.use("/api/workout-sessions", workoutSessionsRoutes);
app.use("/api/posts", postsRoutes);

if (serveProductionClient) {
  app.use(express.static(clientDist, { index: false }));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(join(clientDist, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}

export default app;
