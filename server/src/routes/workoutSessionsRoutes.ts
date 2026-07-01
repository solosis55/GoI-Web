import { Router } from "express";
import {
  createWorkoutSession,
  deleteWorkoutSession,
  getWorkoutSession,
  listSessionsForPicker,
  listWorkoutSessions,
} from "../controllers/workoutSessionsController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const workoutSessionsRoutes = Router();

workoutSessionsRoutes.get("/picker", requireAuth, listSessionsForPicker);
workoutSessionsRoutes.get("/", requireAuth, listWorkoutSessions);
workoutSessionsRoutes.get("/:id", requireAuth, getWorkoutSession);
workoutSessionsRoutes.post("/", requireAuth, createWorkoutSession);
workoutSessionsRoutes.delete("/:id", requireAuth, deleteWorkoutSession);

export default workoutSessionsRoutes;
