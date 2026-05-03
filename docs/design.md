# Design Decision Log (MVP)

## 0) Marca GoI y tokens CSS

- **Asset:** `public/branding/goi-logo.png` (sidebar en `App.tsx` via `GoISidebarBadge`).
- **Paleta (Tailwind v4 `@theme` en `src/index.css`):**
  - `goi-gold` / `goi-gold-dim` — acento tipo oro del logotipo (CTA primaria, pestaña activa, anillos de foco, historias).
  - `goi-steel` — acero / metal para rótulo “FitSocial”, cuerpo de texto secundario en tarjetas oscuras y campos `.goi-field`.
- **Shell:** fondo `bg-black` y borde `neutral-900` en lateral; zona de contenido con cards **zinc / negro** y acentos dorados (feed, entrenos, perfil, auth). Contenedor raiz **`flex min-h-screen flex-col`**: `main.social-shell` crece (`flex-1`) y **`SiteFooter`** queda a ancho completo bajo la rejilla (sesion y auth).
- **Logo en sidebar (`GoISidebarBadge`):** contenedor **circular** (`rounded-full`) con fondo `neutral-950`, anillo dorado suave y sombra; imagen **más pequeña** que el PNG original, centrada con `justify-items-center` en el bloque de marca; textos FitSocial / subtítulo centrados en el ancho del lateral.
- **Clase `.goi-field` (`@layer components` en `index.css`):** inputs sobre paneles oscuros — borde neutro, fondo negro, texto `goi-steel`, foco con borde y anillo **oro** (feed, crear post, comentarios, workouts, perfil, auth).
- **Componentes UI:** `Card` con `tone="dark"` o default (ambos tonos son paneles oscuros con viñeta interior dorada sutil); `Button` `primary` = oro (alineado con `navActive`), `secondary` = píldora clara para contraste sobre negro.
- **Pulido global (mismo `index.css`):**
  - `::selection` — selección de texto con tinte dorado y texto oscuro.
  - Scrollbars — `scrollbar-color` (Firefox) y pseudo-elementos WebKit para barra oscura acorde al shell.
  - `prefers-reduced-motion: reduce` — transiciones y animaciones efectivamente desactivadas o mínimas.
  - `a[href]:focus-visible` — contorno oro para navegación por teclado.
  - Botones (`Button.tsx`) — `focus-visible:ring` oro con `ring-offset-black`.

## 1) Estructura de componentes principales

### Frontend (`src`)
- `App.tsx`: shell principal (`div` flex columna + `main.social-shell`), control de sesion y navegacion por tabs (`feed`, `workouts`, `profile`); sidebar con logotipo GoI; **`SiteFooter`** (`components/layout/SiteFooter.tsx`) en invitado y logueado.
- `components/branding/GoISidebarBadge.tsx`: imagen de marca + rótulo FitSocial + subtítulo (login o `@usuario`).
- `components/layout/SiteFooter.tsx`: pie global — copyright dinámico, texto MVP, enlace **Roadmap** (Trello del README), placeholders Aviso legal / Privacidad / Contacto (`title` “Página en preparación”).
- `context/AuthContext.tsx`: estado global de autenticacion (token, user, login/logout, persistencia local).
- `pages/AuthPage.tsx`: registro, inicio de sesion, solicitud de recuperacion de contraseña y pantalla de nueva contraseña (`?reset=token`); card **`tone="dark"`**, campos **`.goi-field`**, `StatusMessage` con **`tone="dark"`**.
- `pages/FeedPage.tsx`: **encabezado Inicio** (`<header>`: rótulo FitSocial, titulo, texto de contexto y `@usuario`); rejilla feed **columna principal flexible** (`minmax(0,1fr)` + lateral sugerencias); **Historias del gym** en tarjeta **compacta centrada** (`max-w-sm`); `FeedModeTabs` / `StoriesRow` con prop **`compact`** en ese bloque; timeline, crear post, likes, comentarios, seguir usuarios.
- `pages/WorkoutsPage.tsx`: CRUD de entrenamientos; ejercicios por lineas en UI; **busqueda por titulo** y **ordenar** lista (ultima sesion, conteo de sesiones, fecha de creacion de plantilla, titulo A-Z), combinado con filtro por etiqueta; duplicacion de rutina llamando **`createWorkout`** desde la lista (sin endpoint dedicado); **sesiones** (registro + historial) via **`/api/workout-sessions`** en panel **debajo** de la lista (scroll `#registrar-sesion` hacia abajo desde **Registrar sesion** en **`WorkoutItem`**, boton **`primary`**); estadisticas de sesiones por entreno en cliente para cada **`WorkoutItem`**.
- `pages/ProfilePage.tsx`: ver/editar perfil deportivo; bloque **Sesiones registradas** (`WorkoutSessionsHistory`, solo lectura, datos de `GET /api/workout-sessions`).
- `api/*.ts`: cliente HTTP y funciones por dominio (`authApi`, `postsApi`, `workoutsApi`).
- `types/*.ts`: contratos TypeScript del cliente.

### Backend (`server/src`)
- `app.ts`: configuracion Express, middlewares y montaje de rutas.
- `routes/*.ts`: definicion de endpoints REST por recurso.
- `controllers/*.ts`: logica de negocio por endpoint.
- `services/store.ts`: almacenamiento y persistencia local en JSON.
- `server.ts`: arranque del servidor.

## 2) Componentes reutilizables (decision)

Decision actual:
- Mantener paginas feature-first para avanzar rapido en MVP.
- Extraer componentes reutilizables cuando haya repeticion clara.

Componentes reutilizables ya implementados:
- `components/ui/Button.tsx`
- `components/ui/Card.tsx`
- `components/ui/StatusMessage.tsx`
- `components/ui/Avatar.tsx`
- `components/ui/EmptyState.tsx`
- `components/layout/SiteFooter.tsx`
- `components/feed/PostItem.tsx`
- `components/feed/CommentList.tsx`
- `components/feed/PostComposer.tsx`
- `components/feed/PostActions.tsx`
- `components/feed/FollowSuggestionItem.tsx`
- `components/feed/StoriesRow.tsx` (prop opcional **`compact`** para tarjeta pequeña de historias)
- `components/feed/CreatePostForm.tsx`
- `components/feed/FeedModeTabs.tsx` (prop opcional **`compact`**)
- `components/feed/UserSummaryCard.tsx`
- `components/workouts/WorkoutForm.tsx`
- `components/workouts/WorkoutItem.tsx`
- `components/workouts/WorkoutSessionsPanel.tsx`
- `components/workouts/WorkoutSessionsHistory.tsx`
- `components/profile/ProfileForm.tsx`

Siguientes candidatos a extraer:
- `components/feed/FeedSidebar.tsx`

## 3) Gestion del estado de la aplicacion

Estado global:
- `AuthContext` guarda `token` y `user`.
- Se persiste en `localStorage` (`fit-social-auth`) para mantener sesion tras recarga.

Estado local de pagina:
- Feed: posts, comentarios en borrador, sugerencias, modo **Todos/Seguidos**, estados UX.
- Workouts: formulario, lista, edicion, **filtro por titulo** (`titleQuery`), **orden** (`sortKey`), filtro por etiqueta, sesion en borrador y mensajes.
- Profile: formulario y feedback.

Regla de arquitectura:
- Global solo para estado transversal (autenticacion).
- Local para estado de pantalla.
- Si el estado compartido crece entre varias pantallas, evaluar store dedicado (ej. Zustand/Redux).

## 4) Diseno de API REST (backend)

Base URL (cliente):

- Desarrollo: `http://localhost:4000/api` (valor por defecto si no existe `VITE_API_URL`).
- Produccion mismo host que la SPA: rutas relativas `/api` (build sin `VITE_API_URL`).
- Produccion dominio API distinto: definir `VITE_API_URL` en el momento del build (`https://api.ejemplo.com/api`).

Recursos:
- `auth`
- `workouts`
- `posts`
- `health`

### Auth (`/api/auth`)
- `POST /register`
  - body: `{ username, email, password }`
  - 201: `{ message, user }`
- `POST /login`
  - body: `{ email, password }`
  - 200: `{ message, user, token }`
- `POST /forgot-password`
  - body: `{ email }`
  - 200: `{ message }` (misma forma si el email existe o no, para no filtrar cuentas)
  - Solo desarrollo: si `AUTH_RESET_RETURN_TOKEN=true` en el servidor **y** el email existe, respuesta adicional `{ message, devResetToken }` para probar sin servicio de correo (no usar en produccion).
- `POST /reset-password`
  - body: `{ token, password }` (password minimo 6 caracteres, igual que registro)
  - 200: `{ message }` — el token es de un solo uso y caduca a la hora; se guarda solo el hash SHA-256 en el usuario persistido.
- `GET /users?currentUserId=<id>`
  - 200: `{ users: SafeUserWithFollow[] }`
- `GET /profile/:userId`
  - 200: `{ user }`
- `PUT /profile/:userId`
  - body parcial: `{ username?, bio?, goal?, avatarUrl? }`
  - 200: `{ message, user }`
- `GET /following/:userId`
  - 200: `{ followingIds: string[] }`
- `POST /follow/:targetUserId`
  - body: `{ followerId }`
  - 200: `{ following: boolean }`

### Workouts (`/api/workouts`)
- `GET /`
  - 200: `Workout[]` (cada entreno incluye **`tags: string[]`**)
- `POST /`
  - body: `{ title, description?, exercises?, tags? }` (el `userId` lo fija el JWT; **`tags`** opcional, max 12 cadenas de hasta 20 caracteres, sin duplicados ignorando mayusculas; se normalizan en servidor)
  - 201: `Workout`
- `PUT /:id`
  - body parcial: `{ title?, description?, exercises?, tags? }`
  - 200: `Workout`
- `DELETE /:id`
  - 200: `{ message, workout }`

### Sesiones de entreno (`/api/workout-sessions`, JWT obligatorio)

Registro de que el usuario realizo una **plantilla** (`workoutId`) en un instante (`performedAt`). Persisten en `store.workoutSessions` aunque se borre el entreno (el listado muestra titulo sustituto).

- `GET /`
  - 200: `Array<{ id, userId, workoutId, performedAt, notes, createdAt, workoutTitle }>` — solo sesiones del usuario autenticado, orden descendente por `performedAt`.
- `POST /`
  - body: `{ workoutId, performedAt? (ISO), notes? }` — `performedAt` opcional (defecto: ahora); `notes` max 500 caracteres; el entreno debe existir y pertenecer al usuario.
  - 201: `WorkoutSession`
  - Errores comunes: `401` (`AUTH_HEADER_INVALID` / `AUTH_TOKEN_INVALID`), `400` (`WORKOUT_SESSION_INVALID_INPUT`), `403` (`WORKOUT_FORBIDDEN` si el entreno no es tuyo), `404` (`WORKOUT_NOT_FOUND`).
- `DELETE /:id`
  - 200: `{ message, session }`
  - `403` (`WORKOUT_SESSION_FORBIDDEN`) si la sesion es de otro usuario; `404` (`WORKOUT_SESSION_NOT_FOUND`).

### Posts (`/api/posts`)
- `GET /`
  - 200: `PostWithInteractions[]` (incluye `likesCount`, `comments`, `authorUsername`)
- `POST /`
  - body: `{ userId, content, workoutId? }`
  - 201: `PostWithInteractions`
- `DELETE /:id`
  - 200: `{ message, post }`
- `POST /:id/likes`
  - body: `{ userId }`
  - 200: `{ liked: boolean }`
- `POST /:id/comments`
  - body: `{ userId, content }`
  - 201: `Comment`

### Health (`/api/health`)
- `GET /`
  - 200: estado del servicio

## 5) Persistencia: servidor vs cliente

Servidor (persistido en `server/data/store.json`):
- `users` (incluye campos opcionales internos `passwordResetTokenHash` y `passwordResetExpires` mientras un reset este pendiente; no se exponen en respuestas `user` publicas), `workouts`, **`workoutSessions`**, `posts`, `likes`, `comments`, `follows`.
- Fuente de verdad de negocio.

Cliente (persistencia local):
- Sesion autenticada (`token`, `user`) en `localStorage`.
- Resto del estado se recalcula desde API en cada carga de pantalla.

Decision:
- Mantener JSON-file store en MVP.
- Migrar a BD relacional en fase siguiente (PostgreSQL) sin cambiar contratos de API.

## 6) Flujo de datos (simple)

```text
[React UI / Pages]
        |
        | (api/*.ts)
        v
[HTTP client]
        |
        |  REST /api/*
        v
[Express routes] -> [Controllers] -> [Store service]
                                      |
                                      v
                          [server/data/store.json]
```

Flujo tipico:
1. Usuario interactua con una pagina (ej. crear post).
2. La pagina llama a `src/api/postsApi.ts`.
3. Backend valida y persiste en `store.json`.
4. Frontend recarga feed y re-renderiza estado.

## 7) Pendiente inmediato para cerrar arquitectura

- Sustituir placeholders del **`SiteFooter`** (Aviso legal, Privacidad, Contacto) por rutas o URLs reales cuando existan.
- Integrar envio de email para enlaces reales de recuperacion de contraseña (el flujo API + UI ya existe).
- Estandarizar errores API (`{ message, code }`) donde aun falte cobertura.
- Opcional: extraer sidebar completo del feed.
- Mantener convención Tailwind-first para nuevos componentes y reducir CSS legacy a `src/index.css` únicamente.
- Tras cada iteración relevante, actualizar documentación en **`README.md`**, **`docs/project-management.md`**, **`docs/design.md`**, **`docs/components.md`** y **`src/pages/README.md`** (convención descrita en project-management).
- Anadir diagrama de entidades (Users, Posts, Workouts, Likes, Comments, Follows).
- Preparar plan de migracion de `store.json` a PostgreSQL.
