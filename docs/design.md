# Design Decision Log (MVP)

## 0) Marca GoI y tokens CSS

- **Assets por tema (`ThemeContext` + `brandingLogoSrc` en `src/utils/brandingLogo.ts`):** **Legacy** → `public/branding/goi-logo-mark.png`; **Encendido** → `goi-logo-theme-encendido.png`; **Healthy** → `goi-logo-theme-healthy.png`; **Neon** → `goi-logo-theme-neon.png`. Sustituir el PNG en disco mantiene la misma URL pública (`/branding/...`). Sigue existiendo `public/branding/goi-logo.png` como recurso genérico si otras rutas lo referencian; la UI de marca en auth/sidebar consume las rutas anteriores según tema.
- **Shell en temas claros:** `App.tsx`, `SiteFooter` y `LoginHeroBrand` usan **`light:bg-[var(--goi-page-bg)]`** y **`ring-offset-[var(--goi-page-bg)]`** en focos. **`--goi-page-bg`** se define en **`src/index.css`** en **`html[data-theme="encendido"]`** (`#f5f1ed`) y **`html[data-theme="healthy"]`** (`#f6f7f6`).
- **Paleta (Tailwind v4 `@theme` en `src/index.css`):**
  - `goi-gold` / `goi-gold-dim` — acento tipo oro del logotipo (CTA primaria, pestaña activa, anillos de foco, historias).
  - `goi-steel` — acero / metal para rótulo “GoI”, cuerpo de texto secundario en tarjetas oscuras y campos `.goi-field`.
- **Shell:** fondo `bg-black` y borde `neutral-900` en lateral; zona de contenido con cards **zinc / negro** y acentos dorados (feed, entrenos, perfil, auth). Contenedor raiz **`flex min-h-screen flex-col`**: `main.social-shell` crece (`flex-1`) y **`SiteFooter`** queda a ancho completo bajo la rejilla (sesion y auth).
- **Marca GoI en login (`GoISidebarBadge`):** en **`presentation="hero"`** con **`heroHalo`**, el logo rellena el disco con **`object-cover`** + **`scale`** ligera y **`overflow-hidden`** en el anillo (menos “marco” visible del PNG); halo **`.goi-hero-halo`** detrás (188×188 px, 236×236 en `sm`). En **`compact`** (sidebar sin sesión o contextos pequeños): **`object-contain`** en ~72% del anillo, sin halo.
- **Marca con sesión (`SidebarSessionBadge`):** mismo tamaño de aro (**~112px / ~88px** móvil); **imagen del usuario** a **cubierta** (`Avatar` `fill`); rótulo GoI y **`@usuario`** debajo.
- **Nav lateral autenticada (`SidebarNavigation`):** enlaces **Inicio / Rutinas / Perfil** y **Cerrar sesión** con **iconos SVG** alineados a la izquierda (`Button` `secondary`, `navActive` o `danger`). Hover y estado activo con transiciones **`motion-safe:`** (traslación ligera, escala del icono, pulsación); con **`prefers-reduced-motion: reduce`** Tailwind omite esas utilidades y el bloque global de `index.css` acorta el resto. `<nav aria-label="Navegación principal">`; iconos **`aria-hidden`**. En móvil, **Cerrar sesión** ocupa anchura completa (`col-span-2` en rejilla compacta).
- **Clase `.goi-field` (`@layer components` en `index.css`):** inputs sobre paneles oscuros — borde neutro, fondo negro, texto `goi-steel`, foco con borde y anillo **oro** (feed, crear post, comentarios, workouts, perfil, auth).
- **Clase `.goi-field` (`@layer components` en `index.css`):** inputs sobre paneles oscuros — borde neutro, fondo negro, texto `goi-steel`, foco con borde y anillo **oro** (feed, crear post, comentarios, workouts, perfil, auth). Incluye altura mínima táctil (`min-h-11`) para mejorar usabilidad móvil.
- **Componentes UI:** `Card` con `tone="dark"` o default (ambos tonos son paneles oscuros con viñeta interior dorada sutil); `Button` `primary` = oro (alineado con `navActive`), `secondary` = píldora clara para contraste sobre negro.
- **Pulido global (mismo `index.css`):**
  - `::selection` — selección de texto con tinte dorado y texto oscuro.
  - Scrollbars — `scrollbar-color` (Firefox) y pseudo-elementos WebKit para barra oscura acorde al shell.
  - `prefers-reduced-motion: reduce` — transiciones y animaciones efectivamente desactivadas o mínimas.
  - `a[href]:focus-visible` — contorno oro para navegación por teclado.
  - Botones (`Button.tsx`) — `focus-visible:ring` oro con `ring-offset-black`.

## 1) Estructura de componentes principales

### Frontend (`src`)
- `main.tsx`: **`BrowserRouter`** + tema global; rutas declaradas en **`RootRoutes.tsx`**: **`/aviso-legal`**, **`/privacidad`**, **`/contacto`**, cualquier otro **`path`** → **`App.tsx`** shell con pestañas.
- `pages/legal/LegalPageShell.tsx` más **`LegalNoticePage`**, **`PrivacyPage`**, **`ContactPage`** (plantillas españolas con marcadores **`[completar]`**, revisión jurídica recomendada).
- `config/site.ts`: **`PUBLIC_CONTACT_EMAIL`** desde **`import.meta.env.VITE_CONTACT_EMAIL`** (opcional, para **`/contacto`**).
- `App.tsx`: shell principal (`div` flex columna + `main.social-shell`), control de sesion y navegacion por tabs (`feed`, `workouts`, `profile`, **`statistics`**). En **Rutinas**, subvistas internas sin router URL: `workoutsView` = `overview` | `editor` | `catalog` | `exerciseDetail`. Cambiar a Inicio/Perfil **no** resetea la subvista de rutinas (se conserva editor/catalogo/ficha al volver a la pestaña). Estado auxiliar: `catalogFromEditor`, `exerciseDetailFromEditor`, `catalogExerciseId`, modo del editor (`WorkoutEditorMode`). Persistencia de pestaña activa: `sessionStorage` `goi:activeTab`. Borrador crear rutina: ver `workoutCreateDraft` en seccion cliente. Auth **sin sidebar** (marca GoI centrada arriba del formulario); logueado sidebar con **foto de perfil** (`SidebarSessionBadge`) y **`SidebarNavigation`** (iconos + handlers de pestaña y logout). `PageContainer` aplica un **ancho máximo común** (`max-w-6xl`) al contenido principal para alejar las vistas de los bordes externos. Ajuste responsive adicional: en móvil la sidebar reduce separación interna (`max-md:gap-3`) y `SidebarNavigation` colapsa a una sola columna en anchos muy estrechos. **`SiteFooter`** en ambos.
- `components/branding/GoISidebarBadge.tsx`: logo GoI (ruta según tema) + rótulo GoI + subtítulo; props **`presentation`** `compact` | `hero`, **`heroHalo`**, **`heroHaloRef`** (sincronía de animación en `LoginHeroBrand`).
- `components/branding/SidebarSessionBadge.tsx`: avatar del usuario en el lateral + GoI + `@usuario`.
- `components/layout/SidebarNavigation.tsx`: pestañas principal con iconos (`feed`/`workouts`/`profile`), **Cerrar sesión**, accesibilidad y animaciones **`motion-safe`**.
- `components/layout/SiteFooter.tsx`: pie global — copyright dinámico, texto MVP, enlace **Roadmap** (Trello del README), enlaces **`/aviso-legal`**, **`/privacidad`**, **`/contacto`** (páginas legales React + `LegalPageShell`).
- `components/layout/PageContainer.tsx`: wrapper de layout para limitar ancho de páginas autenticadas y mantener padding lateral consistente (incluye padding móvil muy compacto para ganar espacio útil).
- `context/AuthContext.tsx`: estado global de autenticacion (token, user, login/logout, persistencia local).
- `pages/AuthPage.tsx`: registro, inicio de sesion, solicitud de recuperacion de contraseña y pantalla de nueva contraseña (`?reset=token`); card **`tone="dark"`**, campos **`.goi-field`**, `StatusMessage` con **`tone="dark"`**. Tras **registro**, si la API devuelve **`token`** y **`user`**, **`setAuth(reg.token, reg.user)`**; si no, se llama a **`login`** y se usa el usuario devuelto por login con su token (evita desajuste JWT vs perfil).
- `pages/FeedPage.tsx`: **encabezado Inicio** (`<header>`: rótulo GoI, titulo, texto de contexto y `@usuario`); rejilla feed **columna principal flexible** (`minmax(0,1fr)` + lateral sugerencias); **Historias del gym** en tarjeta **compacta centrada** (`max-w-sm`); `FeedModeTabs` / `StoriesRow` con prop **`compact`** en ese bloque; timeline, likes, comentarios, seguir usuarios. Refuerzo responsive: en móvil el bloque de **tu cuenta/sugerencias** se mueve a la columna principal (debajo de historias) y se reserva padding inferior para que el FAB de crear publicación no solape tarjetas al final. Creación de publicación mejorada con **borrador en `sessionStorage`** (`postCreateDraft` por usuario), **validación en vivo** y **preview** antes de publicar. Entrada al compositor por **launcher** (desktop: icono `+` con tooltip en header; móvil: FAB) y modal único responsive (fullscreen móvil / centrado escritorio), sustituyendo la card inline; cierre con cambios pendientes pide confirmación y existe acción explícita de descarte de borrador. En el flujo de imágenes, se añade feedback de transferencia con barra de progreso para compresión y publicación/subida, más **reordenación previa**, selección de portada (primera imagen del payload `media`) y recorte 1:1 con editor manual (zoom + desplazamiento + preview + drag táctil/ratón para mover encuadre + pinch en móvil para zoom) antes de publicar. El sistema de menciones prioriza usuarios seguidos y recientes (histórico local por usuario), y el compositor incorpora plantillas rápidas para acelerar redacción. **`FeedSidebar`** / **`UserSummaryCard`**: **`onGoToProfile`** opcional (desde **`App`** como **`onGoToOwnProfile`**) para que **Ir al perfil** en la cuenta actual navegue a la pestaña **Perfil** sin abrir modal vacío.
- `components/feed/PostItem.tsx`, `PostActions.tsx`, `PostMediaGallery.tsx`, `CreatePostForm.tsx`: fase de pulido visual con superficies agrupadas, contraste más consistente y jerarquía tipográfica/espaciado más clara para mejorar lectura y percepción premium en feed/compositor.
- Testing frontend: `vitest` en raíz (`npm test`) para validar utilidades críticas del compositor (`mentionAutocomplete`, `postComposerTemplates`) sin depender de API ni DOM.
- `pages/WorkoutsPage.tsx`: dashboard de **Rutinas** (rutina = plantilla). Resumen, calendario (`WorkoutSessionCalendar`), CTA **Ir al editor de rutinas** (sin enlace directo al catalogo), lista **Mis rutinas** (buscar/filtrar/ordenar + editar/duplicar/eliminar). Panel registrar/historial no integrado en esta pantalla.
- `pages/WorkoutEditorPage.tsx`: crear o editar rutina; carga catalogo en cliente (`getExercises`). **Miga de pan:** `Rutinas` (vuelve al overview) / texto **Editor de rutinas** / pill **Nueva rutina** o **Editar rutina**. Acceso al catalogo con **Ver catalogo** y formulario con **`ExercisePicker`** + `onOpenCatalog`.
- `pages/ExerciseCatalogPage.tsx`: listado filtrable del catalogo de ejercicios; enlaces a ficha; seleccion para llevar ejercicios al editor. **Miga de pan (desde editor):** `Rutinas` / `Editor de rutinas` / `Nueva rutina`|`Editar rutina` (`routineFormCrumb`) / pill **Catalogo**. Sin editor: `Rutinas` / **Catalogo**.
- `pages/ExerciseDetailPage.tsx`: ficha de un ejercicio (`GET /api/exercises/:id`). **Miga de pan:** flujo completo `Rutinas` → `Editor de rutinas` → formulario → `Catalogo` → nombre; rotulo **Ficha del ejercicio**.
- `pages/ProfilePage.tsx`: ver/editar perfil deportivo; bloque **Entrenamientos registrados** (`WorkoutSessionsHistory`, solo lectura, datos de `GET /api/workout-sessions`).
- `pages/StatisticsPage.tsx`: pestaña **Estadísticas** del shell; contenido personal en **`StatisticsPersonalTab`** (radar octogonal, resúmenes, **`MuscleBodyGlowMapBasic`** con mapa corporal y util **`muscleBodyMapSvgZones.ts`**).
- `pages/PersonalRoadmapPage.tsx`: ruta `/roadmap` (declarada en `RootRoutes.tsx`). Carga inicial: `GET /api/personal-roadmap` si responde, si no `loadRoadmap()` desde `localStorage`. **Guardar cambios** (botón) → `saveRoadmap` + `PUT /api/personal-roadmap`; aviso de cambios sin guardar y `beforeunload` si procede.
- `components/roadmap/RoadmapDiagram.tsx`: pan/zoom, conectores SVG pintados de forma imperativa; registro de nodos para geometría.
- `api/*.ts`: cliente HTTP y funciones por dominio (`authApi`, `postsApi`, `storiesApi`, `workoutsApi`, `personalRoadmapApi`).
- `types/*.ts`: contratos TypeScript del cliente.

### Backend (`server/src`)
- `app.ts`: configuracion Express, middlewares y montaje de rutas.
- `routes/*.ts`: definicion de endpoints REST por recurso.
- `controllers/*.ts`: logica de negocio por endpoint.
- `services/store.ts`: almacenamiento y persistencia local en JSON.
- `server.ts`: arranque del servidor.

Utilidades frontend relacionadas con rutinas:
- `src/utils/workoutCreateDraft.ts` — leer/escribir/limpiar borrador de creacion en `sessionStorage`.
- `src/utils/errorMessages.ts` — incluye codigos del catalogo (p. ej. ejercicio no encontrado) ademas de auth/posts/workouts/stories (**`AUTH_SESSION_STALE`**, `STORY_INVALID_SLIDES`, etc.).

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
- `components/layout/SidebarNavigation.tsx`
- `components/feed/PostItem.tsx`
- `components/feed/CommentList.tsx`
- `components/feed/PostComposer.tsx`
- `components/feed/PostActions.tsx`
- `components/feed/FollowSuggestionItem.tsx`
- `components/feed/StoriesRow.tsx` (prop opcional **`compact`** para tarjeta pequeña de historias)
- `components/feed/CreatePostForm.tsx`
- `components/feed/FeedModeTabs.tsx` (prop opcional **`compact`**)
- `components/feed/UserSummaryCard.tsx`
- `components/feed/FeedSidebar.tsx`
- `components/stats/MuscleBodyGlowMap.tsx`, `components/stats/MuscleBodyGlowMapBasic.tsx` (mapa corporal; zonas ↔ ejes en `src/utils/muscleBodyMapSvgZones.ts`)
- `components/workouts/WorkoutForm.tsx`
- `components/workouts/WorkoutItem.tsx`
- `components/workouts/WorkoutSessionsPanel.tsx`
- `components/workouts/WorkoutSessionsHistory.tsx`
- `components/profile/ProfileForm.tsx`

Siguientes candidatos a extraer:
- (Revisar tras nuevas pantallas grandes; `FeedSidebar` ya está extraído.)

## 3) Gestion del estado de la aplicacion

Estado global:
- `AuthContext` guarda `token` y `user`.
- Se persiste en `localStorage` (`goi-auth`) para mantener sesion tras recarga.

Estado local de pagina:
- Feed: posts, comentarios en borrador, sugerencias, modo **Todos/Seguidos**, estados UX.
- Workouts: overview de rutinas (lista, edicion, **filtro por titulo** `titleQuery`, **orden** `sortKey`, filtro por etiqueta, contadores/calendario) + editor separado para crear rutina.
- Profile: formulario y feedback.

Regla de arquitectura:
- Global solo para estado transversal (autenticacion).
- Local para estado de pantalla.
- Si el estado compartido crece entre varias pantallas, evaluar store dedicado (ej. Zustand/Redux).

## 4) Diseno de API REST (backend)

Ejemplos JSON request/response y mapa de archivos del servidor: **[docs/api.md](./api.md)**.

Base URL (cliente):

- Desarrollo: `http://localhost:4000/api` (valor por defecto si no existe `VITE_API_URL`).
- Produccion mismo host que la SPA: rutas relativas `/api` (build sin `VITE_API_URL`).
- Produccion dominio API distinto: definir `VITE_API_URL` en el momento del build (`https://api.ejemplo.com/api`).

Recursos:
- `auth`
- `workouts`
- `exercises` (catalogo)
- `posts`
- `stories` (reels de imagenes, JWT)
- `personal-roadmap` (JSON en fichero propio, sin JWT)
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
  - 200: `Workout[]` — cada rutina incluye **`tags: string[]`** y **`exerciseIds: string[]`** (IDs del catalogo de ejercicios).
- `POST /`
  - body: `{ title, description?, exerciseIds?, tags? }` (el `userId` lo fija el JWT; **`tags`** opcional con las mismas reglas que antes; **`exerciseIds`** referencias a ejercicios existentes en `store.exercises`)
  - 201: `Workout`
- `PUT /:id`
  - body parcial: `{ title?, description?, exerciseIds?, tags? }`
  - 200: `Workout`
- `DELETE /:id`
  - 200: `{ message, workout }`

### Ejercicios / catalogo (`/api/exercises`, JWT obligatorio)

Catalogo global en `store.json` (`exercises`). Campos: `id`, `name`, `muscles?` (slugs), `equipment?`, `description?`, `instructions?` (texto multilinea). La semilla de nombres/IDs/musculos esta en `defaultExercises.ts`; los textos de ficha por ID en `exerciseDetails.ts` (`EXERCISE_DETAILS_BY_ID`), fusionados en `mergeExerciseCatalog`. Valores en `store.json` pueden sobreescribir longitudes acotadas.

- `GET /`
  - 200: lista de ejercicios (incluye detalles cuando existan).
- `GET /:id`
  - 200: ejercicio; errores tipicos `404` + codigo p. ej. `EXERCISE_NOT_FOUND`.

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

Escritura con JWT cuyo **`userId` no existe** en el store (sesion «huérfana» tras reinicio de datos): **`401`** + codigo **`AUTH_SESSION_STALE`** en creacion de post, like y comentario (ademas de historias; ver abajo). El cliente fuerza cierre de sesion vía `auth:expired`.

### Historias / reels (`/api/stories`, JWT obligatorio)

Carrete activo ~**24 h** por creacion en servidor; listado limitado a **tu usuario** y **personas a las que sigues**. Slides son **imagenes** (Data URL) con limites de tamano/tipo alineados a `postMedia` (validacion en `parseStorySlidesFromRequest`).

- `GET /`
  - 200: `{ authors: FeedStoryAuthor[] }` (agregado por usuario: `userId`, `authorUsername`, `authorAvatarUrl`, `slides[]` con `reelId` por slide).
- `POST /`
  - body: `{ slides: SlideInput[] }` (1–15 imagenes jpeg/png/webp como Data URL segun validaciones del servidor).
  - 201: `{ reel: { id, userId, slides, createdAt, expiresAt } }`
  - Errores comunes: `400` **`STORY_INVALID_SLIDES`**, `401` sin usuario en store (**`AUTH_SESSION_STALE`**), `401` token ausente/incorrecto (middleware).

### Health (`/api/health`)
- `GET /`
  - 200: estado del servicio

### Roadmap personal (`/api/personal-roadmap`, sin JWT)

Diagrama de nodos en árbol para planificación local (página `/roadmap`). Persistencia en fichero separado del `store` — ver `server/src/services/personalRoadmapFile.ts` (`server/data/personal-roadmap.json` en repo local; en Vercel ruta bajo `/tmp` si aplica).

- `GET /`
  - 200: `{ tasks: RoadmapTask[] }` — árbol de tareas (`id`, `title`, `done`, `children`).
- `PUT /`
  - body: `{ tasks: RoadmapTask[] }`
  - 200: mismo esquema que GET tras escribir disco.
  - Errores de validación o escritura según controlador.

En el cliente, la escritura a disco solo ocurre cuando el usuario pulsa **Guardar cambios**; la copia en **`localStorage`** (`goi:personalRoadmap:v1`, utilidades `src/utils/personalRoadmap.ts`) se actualiza en ese mismo paso.

## 5) Persistencia: servidor vs cliente

Servidor (persistido en `server/data/store.json`, o ruta `GOI_STORE_PATH`; en **Vercel** serverless el valor por defecto es un JSON en **`/tmp`** copiado del seed del repo — ver `docs/deploy.md`):
- `users` (incluye campos opcionales internos `passwordResetTokenHash` y `passwordResetExpires` mientras un reset este pendiente; no se exponen en respuestas `user` publicas), `workouts` (**`exerciseIds`** hacia el catalogo), **`exercises`** (catalogo global), **`workoutSessions`**, `posts`, `likes`, `comments`, `follows`, **`storyReels`** (reels de historias con `slides` y `expiresAt`).
- Fuente de verdad de negocio.

Además, **fuera de `store.json`**: roadmap personal en **`server/data/personal-roadmap.json`** (o ruta equivalente en serverless) — solo lectura/escritura vía **`/api/personal-roadmap`**, no mezclado con usuarios ni JWT.

Cliente (persistencia local):
- Sesion autenticada (`token`, `user`) en `localStorage`.
- Pestaña activa (`goi:activeTab`) y borrador **crear rutina** (`goi:workoutCreateDraft` en `sessionStorage`: titulo, descripcion, `exerciseIds`, lineas de etiquetas) — utilidad `src/utils/workoutCreateDraft.ts`.
- Historias «vistas» por usuario: mapa en `localStorage` (`src/utils/storySeen.ts`) para el anillo de **no visto** en `StoriesRow` (complementario al TTL del servidor).
- **Roadmap personal:** árbol de nodos en `localStorage` (`goi:personalRoadmap:v1`, `src/utils/personalRoadmap.ts`); sincronización con disco solo al **guardar** explícitamente en `/roadmap`.
- Resto del estado de pantalla se recalcula desde API cuando aplica.

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

Detalle del cliente HTTP (`apiFetch`, tipos, módulos): **[docs/api-client.md](./api-client.md)**.

## 7) Pendiente inmediato para cerrar arquitectura

- Integrar envio de email para enlaces reales de recuperacion de contraseña (el flujo API + UI ya existe).
- Estandarizar errores API (`{ message, code }`) donde aun falte cobertura.
- Opcional: extraer sidebar completo del feed.
- Mantener convención Tailwind-first para nuevos componentes y reducir CSS legacy a `src/index.css` únicamente.
- Tras cada iteración relevante, actualizar documentación en **`README.md`**, **`docs/project-management.md`**, **`docs/design.md`**, **`docs/components.md`** y **`src/pages/README.md`** (convención descrita en project-management).
- Anadir diagrama de entidades (Users, Posts, Workouts, Likes, Comments, Follows, StoryReels).
- Preparar plan de migracion de `store.json` a PostgreSQL.
