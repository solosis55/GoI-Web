import { Router } from "express";
import { createStory, listStories } from "../controllers/storiesController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const storiesRoutes = Router();

storiesRoutes.get("/", requireAuth, listStories);
storiesRoutes.post("/", requireAuth, createStory);

export default storiesRoutes;
