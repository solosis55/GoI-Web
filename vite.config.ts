import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const GOI_SERVER = "http://localhost:4000";
const LEGACY_SERVER = "http://localhost:4001";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // Goi Server (Neon) — rutas más específicas primero
      "/api/posts": { target: GOI_SERVER, changeOrigin: true },
      "/api/exercises": { target: GOI_SERVER, changeOrigin: true },
      "/api/workouts": { target: GOI_SERVER, changeOrigin: true },
      "/api/workout-sessions": { target: GOI_SERVER, changeOrigin: true },
      "/api/auth/login": { target: GOI_SERVER, changeOrigin: true },
      "/api/auth/register": { target: GOI_SERVER, changeOrigin: true },
      "/api/auth/profile": { target: GOI_SERVER, changeOrigin: true },
      "/api/auth/following": { target: GOI_SERVER, changeOrigin: true },
      "/api/auth/followers": { target: GOI_SERVER, changeOrigin: true },
      "/api/auth/follow/": { target: GOI_SERVER, changeOrigin: true },
      "/api/auth/discover": { target: GOI_SERVER, changeOrigin: true },
      "/api/auth/social/hub": { target: GOI_SERVER, changeOrigin: true },
      "/api/auth/users": { target: GOI_SERVER, changeOrigin: true },
      "/api/auth/notification-prefs": { target: GOI_SERVER, changeOrigin: true },
      "/api/auth/follow-requests": { target: GOI_SERVER, changeOrigin: true },
      "/api/auth/block": { target: GOI_SERVER, changeOrigin: true },
      "/api/auth/blocks": { target: GOI_SERVER, changeOrigin: true },
      "/api/stories": { target: GOI_SERVER, changeOrigin: true },
      "/api/personal-roadmap": { target: GOI_SERVER, changeOrigin: true },
      "/api/auth/forgot-password": { target: GOI_SERVER, changeOrigin: true },
      "/api/auth/reset-password": { target: GOI_SERVER, changeOrigin: true },
      "/api/auth/personal-body": { target: GOI_SERVER, changeOrigin: true },
      "/uploads": { target: GOI_SERVER, changeOrigin: true },
      "/api/health": { target: GOI_SERVER, changeOrigin: true },
      // Todo /api no listado arriba → Goi Server (Express :4001 solo si lo arrancas a mano)
      "/api": { target: GOI_SERVER, changeOrigin: true },
    },
  },
});
