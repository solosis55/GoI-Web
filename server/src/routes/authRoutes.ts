import { Router } from "express";
import {
  getFollowers,
  getFollowing,
  getProfile,
  handleProfileImageMulter,
  discoverUsers,
  listUsers,
  login,
  register,
  requestPasswordReset,
  resetPasswordWithToken,
  listBlockedUsers,
  listBlockedUsersPreviews,
  listPendingFollowRequests,
  listSentFollowRequests,
  respondFollowRequest,
  toggleBlockUser,
  toggleFollow,
  updateProfile,
  uploadProfileAvatarFile,
  uploadProfileBannerFile,
} from "../controllers/authController.js";
import { getPublicProfileOverview, listProfileSocial } from "../controllers/publicProfileController.js";
import {
  getNotificationPrefs,
  getSocialHub,
  listUserPreviews,
  putNotificationPrefs,
  searchUsers,
} from "../controllers/socialController.js";
import { createProfileImageUploader } from "../middleware/profileImageUpload.js";
import { getPersonalBody, putPersonalBody } from "../controllers/personalBodyController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const authRoutes = Router();

const avatarUpload = createProfileImageUploader("avatars");
const bannerUpload = createProfileImageUploader("banners");

authRoutes.post("/register", register);
authRoutes.post("/login", login);
authRoutes.post("/forgot-password", requestPasswordReset);
authRoutes.post("/reset-password", resetPasswordWithToken);
authRoutes.get("/users", requireAuth, listUsers);
authRoutes.get("/users/search", requireAuth, searchUsers);
authRoutes.get("/users/previews", requireAuth, listUserPreviews);
authRoutes.get("/social/hub", requireAuth, getSocialHub);
authRoutes.get("/discover", requireAuth, discoverUsers);
authRoutes.get("/notification-prefs", requireAuth, getNotificationPrefs);
authRoutes.put("/notification-prefs", requireAuth, putNotificationPrefs);
authRoutes.get("/profile/:userId", requireAuth, getProfile);
authRoutes.get("/profile/:userId/public", requireAuth, getPublicProfileOverview);
authRoutes.get("/profile/:userId/social/:kind", requireAuth, listProfileSocial);
authRoutes.put("/profile/:userId", requireAuth, updateProfile);
authRoutes.post(
  "/profile/:userId/avatar",
  requireAuth,
  handleProfileImageMulter(avatarUpload),
  uploadProfileAvatarFile,
);
authRoutes.post(
  "/profile/:userId/banner",
  requireAuth,
  handleProfileImageMulter(bannerUpload),
  uploadProfileBannerFile,
);
authRoutes.get("/following/:userId", requireAuth, getFollowing);
authRoutes.get("/followers/:userId", requireAuth, getFollowers);
authRoutes.post("/follow/:targetUserId", requireAuth, toggleFollow);
authRoutes.get("/follow-requests", requireAuth, listPendingFollowRequests);
authRoutes.get("/follow-requests/sent", requireAuth, listSentFollowRequests);
authRoutes.post("/follow-requests/:requesterId", requireAuth, respondFollowRequest);
authRoutes.post("/block/:targetUserId", requireAuth, toggleBlockUser);
authRoutes.get("/blocks", requireAuth, listBlockedUsers);
authRoutes.get("/blocks/previews", requireAuth, listBlockedUsersPreviews);
authRoutes.get("/personal-body", requireAuth, getPersonalBody);
authRoutes.put("/personal-body", requireAuth, putPersonalBody);

export default authRoutes;
