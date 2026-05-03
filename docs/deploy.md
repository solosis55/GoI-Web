# Despliegue (MVP)

Objetivo: publicar **frontend + API en un solo origen** (`/` la SPA, `/api/*` el backend) para evitar CORS y configurar una sola URL en produccion.

## Que hace el proyecto en produccion

1. **Cliente** (`npm run build` en la raiz): genera estáticos en `/dist` con `VITE_API_URL` no definida → el cliente llama a rutas **relativas** `/api` (ver `src/api/client.ts`).
2. **Servidor** (`npm run build` en `server`): compila Express a `server/dist/`.
3. Con `NODE_ENV=production` y existiendo `dist/index.html` junto al repo (desde `server/dist` se resuelve `../../dist`), Express:
   - sirve archivos estáticos de esa carpeta,
   - ante `GET`/`HEAD` que **no** empiezan por `/api`, devuelve `index.html` (SPA),
   - usa `trust proxy` para que rate limit y IPs detrás de reverse proxy sean correctos.

La **salud** del servicio: `GET /api/health`.

## Variables de entorno obligatorias / recomendadas

| Variable | Donde | Produccion |
|---------|--------|------------|
| `NODE_ENV` | Servidor | `production` |
| `JWT_SECRET` | Servidor | **Obligatoria** antes de login/registro en produccion (emisión del JWT falla sin ella; ver `server/src/services/auth.ts`) |
| `PORT` | Servidor | La asigna casi todo PaaS (Render, Fly, Railway). Por defecto local `4000`. |
| `VITE_API_URL` | **Build** del cliente | Solo si front y API van en **hosts distintos**; entonces `https://api.tudominio.com/api` y el build debe hacerse con esa variable definida. |

Consulta `server/.env.example` para variables adicionales opcionales (`AUTH_RESET_RETURN_TOKEN`, etc.).

## Persistencia (importante)

Los datos viven en **`server/data/store.json`**. En contenedores/PaaS sin **volumen persistente**, el fichero se pierde al redesplegar o recrear la instancia.

- **MVP**: aceptable para pruebas.
- **Siguiente paso**: volumen Docker, disco persistente en el proveedor, o base de datos.

## Build y arranque manual (sin Docker)

En la **raiz del repo**:

```bash
npm run build:deploy
```

En el **servidor**, con el directorio de trabajo en la **raiz del repo** (para que `dist/` sea accesible desde `server/dist`):

```bash
set NODE_ENV=production
set JWT_SECRET=tu_secreto_largo
node server/dist/server.js
```

(Linux/macOS: `export NODE_ENV=production` y `export JWT_SECRET=...`)

## Docker

Desde la raiz del repo:

```bash
docker build -t fitsocial-mvp .
docker run --rm -p 4000:4000 -e NODE_ENV=production -e JWT_SECRET=un_secreto_largo_aleatorio fitsocial-mvp
```

Monta un volumen si quieres conservar datos, por ejemplo `-v fitsocial-data:/app/server/data`.

## Plataformas tipo Render / Railway / Fly

Pasos típicos:

1. Repo conectado a Git.
2. **Build**: `npm run build:deploy` (raiz del repo como contexto).
3. **Start**: `node server/dist/server.js` desde la misma raiz (o comando equivalente con `WORKDIR` en raiz).
4. Definir `JWT_SECRET` y `NODE_ENV=production` en variables del servicio.

Si la plataforma solo permite `WORKDIR` dentro de `server/`, mueve este flujo o ajusta rutas en `app.ts`; el diseño actual asume **`dist`** en **padre de `server/`**.

## Vercel (solo frontend estático)

Vercel sirve habitualmente **solo los estáticos** del `npm run build` de Vite. Las peticiones del cliente van a **`/api/...`** en el **mismo dominio** (`import.meta.env.PROD` sin `VITE_API_URL`). Si **no** hay ningún backend detrás de ese dominio, esas rutas **no existen**: obtendrás **404** o una respuesta que **no es JSON**, y en la UI aparecía el mensaje genérico *"Unexpected API error"* (ahora el cliente muestra un texto más claro).

**Opciones coherentes con este repo:**

1. **API en otro host (recomendado con Vercel)**  
   - Despliega el servidor Express en Render, Railway, Fly.io, etc. (ver sección anterior: `npm run build:deploy`, `node server/dist/server.js`, `JWT_SECRET`).  
   - En **Vercel → Settings → Environment variables**, define **`VITE_API_URL`** con la URL base de la API, por ejemplo `https://tu-api.onrender.com/api` (sin barra final extra; debe coincidir con cómo montas las rutas en Express).  
   - **Importante:** Vite sustituye `import.meta.env.VITE_*` en **tiempo de build**. Tras cambiar la variable, haz un **nuevo deploy** / rebuild del proyecto.

2. **Un solo origen (sin Vercel para la API)**  
   - Un único proceso Node en producción sirve `/api` + estáticos (`docs/deploy.md` ya lo describe). Eso no es el modelo “solo Vercel estático”.

3. **Proxy en Vercel (avanzado)**  
   - Puedes usar `rewrites` en `vercel.json` para enviar `/api/:path*` a tu backend externo. La URL de destino suele ser fija en el fichero o gestionada según documentación de Vercel.

Mientras no exista una API alcanzable desde el navegador con la URL que usa el build, login y el resto de llamadas fallarán.

## Checklist antes de abrir al publico

- [ ] `JWT_SECRET` definida y no incluida en el repositorio.
- [ ] `AUTH_RESET_RETURN_TOKEN` **no** activada en produccion (solo desarrollo sin email real).
- [ ] Probado `/`, carga JS/CSS y login contra `/api/auth/login`.
- [ ] Decision tomada sobre **persistencia** de `store.json` o migracion futura.
