# Legacy — Express en Vercel (archivado)

**Fase 0 (2026):** la API en producción es **Goi Server** en Render (`https://goi-server.onrender.com/api`).

`index.mjs` y `vercel.json` ya **no** enrutan `/api` a Express. Este fichero se conserva solo como referencia histórica y para migraciones locales (`Goi Web/server/`).

**Web en prod:** [https://go-i.vercel.app](https://go-i.vercel.app) → solo estáticos; el cliente usa `VITE_API_URL` hacia Render.
