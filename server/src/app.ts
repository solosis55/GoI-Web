import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import dotenv from "dotenv";
import express, { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/authRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import postsRoutes from "./routes/postsRoutes.js";
import storiesRoutes from "./routes/storiesRoutes.js";
import exercisesRoutes from "./routes/exercisesRoutes.js";
import workoutSessionsRoutes from "./routes/workoutSessionsRoutes.js";
import workoutsRoutes from "./routes/workoutsRoutes.js";
import { sendError } from "./services/http.js";
import { initializeStore } from "./services/store.js";

dotenv.config();

const app = express();

if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
  app.set("trust proxy", 1);
}

initializeStore();

const moduleDir = dirname(fileURLToPath(import.meta.url));
const clientDist = resolve(moduleDir, "../../dist");
const serveProductionClient =
  process.env.NODE_ENV === "production" && existsSync(join(clientDist, "index.html"));

app.use(cors());
/** Historías y posts con fotos en base64; el límite por defecto (100 KB) corta payloads válidos. */
app.use(express.json({ limit: "18mb" }));

const isTestEnv = process.env.VITEST === "true" || process.env.NODE_ENV === "test";
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 10_000 : 20,
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
        exercises: "/api/exercises",
        workoutSessions: "/api/workout-sessions",
        posts: "/api/posts",
        stories: "/api/stories",
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
app.use("/api/exercises", exercisesRoutes);
app.use("/api/workout-sessions", workoutSessionsRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/stories", storiesRoutes);

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

app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof Error && err.message === "JWT_SECRET is required in production") {
    sendError(
      res,
      503,
      "AUTH_JWT_NOT_CONFIGURED",
      "Set JWT_SECRET in your host environment (e.g. Vercel Project Settings → Environment Variables), then redeploy.",
    );
    return;
  }
  console.error(err);
  sendError(res, 500, "INTERNAL_SERVER_ERROR", "unexpected server error");
});

export default app;
