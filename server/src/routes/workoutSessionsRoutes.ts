import { Router } from "express";
import {
  createWorkoutSession,
  deleteWorkoutSession,
  listWorkoutSessions,
} from "../controllers/workoutSessionsController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const workoutSessionsRoutes = Router();

workoutSessionsRoutes.get("/", requireAuth, listWorkoutSessions);
workoutSessionsRoutes.post("/", requireAuth, createWorkoutSession);
workoutSessionsRoutes.delete("/:id", requireAuth, deleteWorkoutSession);

export default workoutSessionsRoutes;
