import { Router } from "express";
import {
  createComment,
  createPost,
  deletePost,
  listNotifications,
  listFeed,
  listPostLikes,
  listPosts,
  listPostsByUser,
  markNotificationsRead,
  toggleLike,
  updatePost,
} from "../controllers/postsController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const postsRoutes = Router();

postsRoutes.get("/", requireAuth, listPosts);
postsRoutes.get("/feed", requireAuth, listFeed);
postsRoutes.get("/notifications", requireAuth, listNotifications);
postsRoutes.post("/notifications/read", requireAuth, markNotificationsRead);
postsRoutes.get("/by-user/:targetUserId", requireAuth, listPostsByUser);
postsRoutes.post("/", requireAuth, createPost);
postsRoutes.put("/:id", requireAuth, updatePost);
postsRoutes.delete("/:id", requireAuth, deletePost);
postsRoutes.get("/:id/likes", requireAuth, listPostLikes);
postsRoutes.post("/:id/likes", requireAuth, toggleLike);
postsRoutes.post("/:id/comments", requireAuth, createComment);

export default postsRoutes;
