import { Router } from "express";
import {
  getFollowing,
  getProfile,
  listUsers,
  login,
  register,
  requestPasswordReset,
  resetPasswordWithToken,
  toggleFollow,
  updateProfile,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const authRoutes = Router();

authRoutes.post("/register", register);
authRoutes.post("/login", login);
authRoutes.post("/forgot-password", requestPasswordReset);
authRoutes.post("/reset-password", resetPasswordWithToken);
authRoutes.get("/users", requireAuth, listUsers);
authRoutes.get("/profile/:userId", requireAuth, getProfile);
authRoutes.put("/profile/:userId", requireAuth, updateProfile);
authRoutes.get("/following/:userId", requireAuth, getFollowing);
authRoutes.post("/follow/:targetUserId", requireAuth, toggleFollow);

export default authRoutes;
