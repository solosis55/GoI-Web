# Project Management

## Objetivo
Organizar el desarrollo de la app (red social + deporte) con pasos claros y accionables.

## Convencion de documentacion
Cualquier cambio relevante de **producto, UX, API, despliegue o convenciones de codigo** debe reflejarse en los docs del repo, no solo en el codigo. Como minimo revisar y actualizar cuando aplique:

- Raiz: **`README.md`** (alcance, stack, marca, scripts).
- **`docs/project-management.md`** (estado, checklist, pasos implementados, operativa).
- **`docs/design.md`** (arquitectura, tokens, decisiones de UI/API).
- **`docs/components.md`** (props y uso de componentes reutilizables).
- **`src/pages/README.md`** (comportamiento y presentacion de cada pantalla).

## Estado
- Fecha de inicio: 2026-04-27
- Fase actual: Cierre del MVP y estandarizacion de UI con Tailwind; refuerzo de **marca multi-tema**, **auth post-registro**, **feed** (ir al propio perfil) y **estadísticas / mapa muscular**.
- Ultimo refinamiento UX + marca: shell **negro**, marca **GoI** (logo circular centrado en sidebar, tokens **oro/acero**), paneles **zinc** con acentos dorados, formularios con **`.goi-field`**, pulido global (**seleccion de texto**, **scrollbars** oscuros, **`prefers-reduced-motion`**, **focus-visible** en enlaces y botones). **Inicio**: encabezado de pagina, feed a ancho util, historias compactas (**reels de imagenes** caducadas en servidor tras ~24 h, visibilidad tipo seguidos + tu propio carrete). **Rutinas**: dashboard con resumen + calendario + lista, editor dedicado y breadcrumb visual; sin bloque de registro/historial en esa pestaña para reducir saturacion. **Pie** global `SiteFooter`.
- Operativa desarrollo (**store JSON + JWT local**): si se reinicia o sustituye `store.json` y el navegador conserva JWT, pueden aparecer acciones escritoras fallidas hasta volver a iniciar sesion; el backend usa `401` + **`AUTH_SESSION_STALE`** en ese caso y el cliente fuerza **`auth:expired`**. Para cuentas `*@test.com` reproducibles existe **`npm run seed:demo-users`** (solo emails nuevos) y **`npm run reset:demo-users`** (upsert de las cuatro cuentas y password `123456` segun `demoUsers.ts`; ver **`README.md`**).

## Recomendaciones MVP

### Funcionalidades recomendadas para incluir
- [x] Publicaciones (crear y ver en feed).
- [x] Entrenamientos (crear, editar y eliminar).
- [x] Perfil deportivo basico (foto, bio, objetivo).
- [x] Interacciones minimas (likes y comentarios).
- [x] Historial de entrenamientos para progreso semanal.
- [x] Historias / reels de imagenes (API `/api/stories`, visibilidad a seguidores + usuario actual, TTL ~24 h).

### Funcionalidades recomendadas para dejar fuera (Fase 2)
- [ ] Chat en tiempo real.
- [ ] Historias con video edicion tipo «stories» avanzadas (el MVP usa imagenes Data URL segun limites del servidor).
- [ ] Sistema avanzado de notificaciones.
- [ ] Recomendaciones con IA.

### Criterios de exito del MVP
- [ ] El usuario completa el flujo principal: crear rutina -> publicarla/vincularla en el feed -> revisar progreso.
- [ ] El usuario entiende la app sin tutorial largo.
- [ ] El usuario repite uso al menos 2 veces por semana en pruebas iniciales.

## Paso a paso

### 1) Definir alcance del MVP
- [x] Problema principal y usuario objetivo definidos.
- [x] Funciones base: publicaciones + entrenamientos.
- [x] Cerrar lista final de funcionalidades MVP.

### 2) Diseñar arquitectura inicial
- [x] Estructura frontend y backend validada.
- [x] Convenciones de nombres y carpetas.
- [x] Variables de entorno necesarias.

### 3) Backend MVP
- [x] Setup servidor backend.
- [x] Autenticacion (registro/login).
- [x] CRUD de entrenamientos.
- [x] Perfil basico (ver/editar).
- [x] CRUD de publicaciones.
- [x] Likes y comentarios.

### 4) Frontend MVP
- [x] Pantallas: Login/Register.
- [x] Pantalla: Feed.
- [x] Pantalla: Crear publicacion.
- [x] Pantalla: Mis entrenamientos.
- [x] Pantalla: Perfil.

### 5) Integracion y pruebas
- [x] Conectar frontend con API.
- [x] Manejo de errores y estados de carga.
- [x] Tests automatizados de seguridad del backend (detalle en **Tests de seguridad (backend)**).
- [x] Hardening de autenticacion y validaciones (rate limit + expiracion de sesion + validacion consistente de input).
- [x] Pruebas del flujo principal de usuario (multi-cuenta / flujo clave revisado, mayo 2026).

### 6) Validacion con usuarios
- [x] Prueba con 3-5 usuarios reales (sesiones de validacion completadas, mayo 2026).
- [x] Recoger feedback clave.
- [x] Priorizar mejoras para siguiente iteracion (siguiente foco: auth UX y construccion incremental).

## Tests de seguridad (backend)

Ubicacion: `server/src/__tests__/`. Se ejecutan con Vitest y peticiones HTTP via `supertest` contra la app Express. En cada caso el store en memoria se vacia en `beforeEach` para aislar escenarios.

### `posts-security.test.ts` (posts)

| Escenario | Comportamiento esperado |
|-----------|-------------------------|
| Crear publicacion sin `Authorization` | `401`, codigo `AUTH_HEADER_INVALID`. |
| Crear publicacion con `Bearer <token>` valido | `201`, cuerpo con `id` y contenido. |
| Like o comentario sin token (post existente) | `401`, codigo `AUTH_HEADER_INVALID`. |
| Borrar publicacion de otro usuario (token de intruso) | `403`, codigo `POST_FORBIDDEN`. |

Sesion JWT valida pero **usuario borrado del store en memoria** (no cubierta por estos tests pero contrato estable): escritura que exige usuario existente (p. ej. crear post, like, comentar, crear historia) debe responder **`401`** con codigo **`AUTH_SESSION_STALE`** para distinguir sesion huérfana tras reset de datos o proceso desalineado; el cliente debe cerrar sesion y pedir login de nuevo.

### `auth-workouts.test.ts` (auth + entrenamientos + perfil)

| Escenario | Comportamiento esperado |
|-----------|-------------------------|
| Login con credenciales inexistentes | `401`, codigo `AUTH_INVALID_CREDENTIALS`, `message` string. |
| Crear entrenamiento sin token | `401`, codigo `AUTH_HEADER_INVALID`. |
| Crear entrenamiento con token valido | `201`, entrenamiento con `id` y datos enviados. |
| Borrar entrenamiento de otro usuario | `403`, codigo `WORKOUT_FORBIDDEN`. |
| Actualizar perfil (`PUT /api/auth/profile/:userId`) con token de otro usuario | `403`, codigo `AUTH_FORBIDDEN`. |

### `workout-sessions.test.ts` (sesiones de entreno)

| Escenario | Comportamiento esperado |
|-----------|-------------------------|
| Listar sesiones sin token | `401`, codigo `AUTH_HEADER_INVALID`. |
| Crear sesion con entreno propio | `201`, sesion con `id` y `workoutId`; listado incluye `workoutTitle`. |
| Crear sesion con entreno ajeno | `403`, codigo `WORKOUT_FORBIDDEN`. |
| Borrar sesion de otro usuario | `403`, codigo `WORKOUT_SESSION_FORBIDDEN`. |

Nota: `auth-workouts.test.ts` aisla estado en **memoria** (`beforeEach`); **`saveStore()` no escribe disco** con Vitest activo, así que el JSON real del repo ya no se restaura después de la suite (evitar sobrescribir cuentas demo u otros datos tras `npm run reset:demo-users`).

## Mensajes de error (frontend)

Se centralizaron textos amigables para el usuario en `src/utils/errorMessages.ts`. La funcion `getErrorMessage` recibe el error (incluido `ApiError` del cliente HTTP con `code`) y un mensaje por defecto; mapea codigos del backend (`AUTH_INVALID_CREDENTIALS`, `AUTH_EMAIL_IN_USE`, `AUTH_FORBIDDEN`, `POST_FORBIDDEN`, `WORKOUT_FORBIDDEN`, recursos no encontrados, etc.) a frases en castellano, con fallback al `message` del servidor o al texto de respaldo. Las pantallas que llaman a la API pueden usar esto para mostrar errores coherentes con los codigos de los tests de seguridad.

Actualizacion reciente:
- Se ampliaron los codigos soportados en `errorMessages` (`AUTH_REGISTER_INVALID_INPUT`, `AUTH_LOGIN_INVALID_INPUT`, `AUTH_PROFILE_INVALID_INPUT`, `AUTH_RATE_LIMITED`, `POST_INVALID_INPUT`, `COMMENT_INVALID_INPUT`, `WORKOUT_INVALID_INPUT`, entre otros).
- **`AUTH_SESSION_STALE`**: mensaje orientado a reinicio de datos / otro entorno; el cliente HTTP lo trata como expiracion de sesion (mismo camino que token invalido en `src/api/client.ts`) para volver a login sin quedarse en errores opacos en modales (historias, posts, etc.).
- En `AuthPage`, cuando llega `AUTH_RATE_LIMITED`, se muestra un mensaje especifico y se bloquea temporalmente el boton de envio para evitar reintentos inmediatos.
- Codigos de recuperacion de contraseña: `AUTH_FORGOT_PASSWORD_INVALID_INPUT`, `AUTH_RESET_INVALID_INPUT`, `AUTH_RESET_TOKEN_INVALID`.

## Hardening de autenticacion y validaciones

### Seguridad de autenticacion
- Se anadio rate limit para `POST /api/auth/login` y `POST /api/auth/register` con `express-rate-limit` (ventana 15 min, max 20 intentos, codigo `AUTH_RATE_LIMITED`).
- Se implemento logout global en frontend cuando `apiFetch` recibe fallo HTTP y **`shouldExpireSession`** aplica (`401` siempre incluido para errores HTTP, mas confirmacion explicita si el cuerpo trae **`AUTH_UNAUTHORIZED`**, **`AUTH_TOKEN_INVALID`** o **`AUTH_SESSION_STALE`**): se emite `AUTH_EXPIRED_EVENT` desde `src/api/client.ts` y `AuthContext` limpia almacenamiento. **`AUTH_SESSION_STALE`** alinea UX cuando el JWT sigue valido pero el usuario ya no esta en disco (tras reset de **`store.json`** u otro desajuste).
- Se reforzo `JWT_SECRET`: en produccion es obligatorio definirlo; solo fuera de produccion se usa el secreto por defecto.

### Normalizacion y validacion consistente de input (backend)
- Se creo `server/src/services/validation.ts` con helpers reutilizables (`sanitizeText`, `normalizeEmail`, `isLengthBetween`, `sanitizeStringArray`).
- Se endurecieron validaciones en controladores:
  - `workoutsController`: `title` 3-80, `description` max 280, saneado de `exercises` y limite de elementos.
  - `postsController`: `content` de post 4-280, `content` de comentario 1-180.
  - `authController`: email normalizado, username 3-24, password minima en registro, validaciones de perfil (`bio`, `goal`, `avatarUrl`).

## Implementacion realizada (paso a paso)

1. Se inicializo el proyecto con Vite + React + TypeScript.
2. Se instalo `react-router-dom` para preparar enrutado.
3. Se creo la estructura de carpetas frontend en `src/` (`components`, `pages`, `hooks`, `types`, `utils`, `context`, `api`).
4. Se creo la estructura backend en `server/src` (`routes`, `controllers`, `services`, `config`).
5. Se anadieron `README.md` por carpeta para documentar su contenido esperado.
6. Se levanto backend minimo en `server` con Express + TypeScript.
7. Se implementaron endpoints base:
   - `GET /api/health`
   - `POST /api/auth/register`
   - `POST /api/auth/login`
   - `GET|POST|PUT|DELETE /api/workouts`
8. Se conecto el frontend con API y `localStorage` (sesion de usuario).
9. Se implemento UI de autenticacion (registro/login).
10. Se implemento UI de entrenamientos (crear, listar, eliminar).
11. Se anadio edicion de entrenamientos en la UI (guardar/cancelar).
12. Se activo persistencia local del backend con archivo JSON en `server/data/store.json`.
13. Se reinicio y valido backend/frontend para asegurar flujo funcional end-to-end.
14. Se anadieron campos de perfil al usuario (`bio`, `goal`, `avatarUrl`) en backend.
15. Se implementaron endpoints de perfil (`GET/PUT /api/auth/profile/:userId`).
16. Se implemento pantalla de perfil en frontend para ver y editar datos.
17. Se anadio navegacion basica entre Entrenamientos y Perfil.
18. Se anadio entidad `Post` en backend con persistencia en archivo local JSON.
19. Se implementaron endpoints de publicaciones (`GET/POST/DELETE /api/posts`).
20. Se implemento pantalla Feed en frontend con formulario para crear publicaciones.
21. Se anadio opcion para vincular una publicacion a un entrenamiento del usuario.
22. Se actualizo la navegacion con pestana de Feed y se valido el flujo completo.
23. Se implementaron likes para publicaciones (`POST /api/posts/:id/likes`) con comportamiento toggle.
24. Se implementaron comentarios en publicaciones (`POST /api/posts/:id/comments`).
25. El endpoint de listado de posts ahora devuelve conteo de likes y lista de comentarios.
26. Se actualizo el Feed para permitir dar like y comentar en cada publicacion.
27. Se mejoro UX con confirmacion antes de eliminar entrenamientos/publicaciones.
28. Se anadieron mensajes de exito tras crear, editar o eliminar acciones clave.
29. Se agregaron validaciones basicas de longitud/formato en auth, perfil, entrenamientos, posts y comentarios.
30. Se anadieron media queries para mejorar el uso en movil (header, acciones, tarjetas y formularios).
31. Se convirtio el Feed en pagina principal "Inicio" con publicaciones de toda la comunidad y accesos rapidos a Perfil/Entrenamientos.
32. Se rediseño la UI de Inicio con estructura tipo red social (sidebar izquierda, feed central y panel derecho de sugerencias).
33. Se implemento seguir usuarios (follow/unfollow) con persistencia en backend.
34. Se añadio filtro de feed por "Todos" y "Seguidos".
35. Se integraron botones de seguir en sugerencias de la Home.
36. Se extrajeron y consolidaron componentes reutilizables en `ui`, `feed`, `workouts` y `profile`.
37. Se documento arquitectura y componentes en `docs/design.md` y `docs/components.md`.
38. Se instalo y configuro Tailwind CSS en Vite (`tailwindcss` + `@tailwindcss/vite`).
39. Se migro la UI principal a Tailwind-first (botones, cards, formularios, layouts y listas de feed/workouts/perfil).
40. Se limpio `src/App.css` dejando estilo legacy minimo tras la migracion.
41. Se anadieron tests de seguridad del API: `posts-security.test.ts` (posts, likes, comentarios, borrado) y `auth-workouts.test.ts` (login, workouts, perfil ajeno), con Vitest y supertest.
42. Se anadieron mensajes de error user-facing en `src/utils/errorMessages.ts` (`getErrorMessage`, mapa por codigo de API), alineados con respuestas del backend.
43. Se anadio rate limit en autenticacion (`/api/auth/login` y `/api/auth/register`) para mitigar intentos abusivos y devolver `AUTH_RATE_LIMITED`.
44. Se implemento expiracion de sesion global en frontend: `api/client` emite `AUTH_EXPIRED_EVENT` ante errores auth, y `AuthContext` limpia estado/localStorage automaticamente.
45. Se reforzo el manejo de secretos JWT: en produccion el backend exige `JWT_SECRET` y falla al arrancar si no esta definido.
46. Se incorporo una capa comun de validacion (`server/src/services/validation.ts`) y se aplicaron reglas consistentes de normalizacion/longitud en `authController`, `postsController` y `workoutsController`.
47. Se actualizo `errorMessages.ts` con nuevos codigos de validacion/rate-limit y se mejoro UX en `AuthPage` para `AUTH_RATE_LIMITED` (mensaje especifico + bloqueo temporal del submit).
48. Se implemento recuperacion de contraseña en API: `POST /api/auth/forgot-password` y `POST /api/auth/reset-password`, token de un solo uso (hash SHA-256 en `store.json`), caducidad 1 hora, misma ventana de rate limit que login/registro. Respuesta generica para no filtrar existencia de email.
49. Se amplio `AuthPage` con flujo "Olvide mi contraseña", formulario de nueva contraseña con enlace `?reset=<token>`, mensaje de exito y alineacion de validacion (minimo 6 caracteres en contraseña). En desarrollo, con `AUTH_RESET_RETURN_TOKEN=true` en el servidor, la API puede devolver `devResetToken` y la UI muestra el enlace local (solo si `import.meta.env.DEV`).
50. Documentacion sincronizada: `docs/design.md`, `docs/project-management.md`, `src/pages/README.md`, `server/.env.example`.
51. Despliegue preparado: cliente en modo `production` usa base API `/api` (`src/api/client.ts`); con `NODE_ENV=production` el servidor sirve la SPA desde la carpeta `dist` del monorepo, `trust proxy` para rate limiting tras proxy y guia operativa unificada en `docs/deploy.md`, Dockerfile y scripts `npm run build:deploy` / `npm run start:deploy` en la raiz.
52. Autenticacion alineada al producto: sin sesion se reutiliza **`social-shell`** (`App.tsx`) con la misma rejilla y sidebar que la app logueada; formulario de auth sobre **card** coherente con el resto de la app; boton **primario** de envio ancho completo; `autocomplete` donde aplica; documentacion en `docs/components.md`, `src/pages/README.md` y este archivo. *(La card de auth paso a tema oscuro y campos `.goi-field` en el paso 54.)*
53. Identidad GoI en UI: logotipo en **`public/branding/goi-logo.png`**, componente **`GoISidebarBadge`**, tokens **`goi-gold` / `goi-steel`** en `index.css`, shell y sidebar con **fondo negro** y pestaña activa en **oro** (`Button` `navActive`); README y `docs/design.md` actualizados.
54. Extension de marca GoI en casi toda la UI: **`body`** en negro; **`Card`** con paneles zinc/negro e highlight interior sutil dorado; **`Button`** `primary` en oro (misma linea que `navActive`), `secondary` como pildora clara sobre fondos oscuros, `link` / `linkDark` en tonos oro/acero; clase **`.goi-field`** (`index.css` + `@layer components`) para inputs en feed, entrenos, perfil y auth; componentes de feed/workouts/profile con bordes y textos alineados (p. ej. **StoriesRow** con aro dorado en lugar de acento ajeno al logo).
55. Sidebar de marca: logo en **contenedor circular** (diametro ~112px escritorio, ~88px movil), imagen con `object-contain`; bloque **`GoISidebarBadge`** centrado en el ancho del lateral (`justify-items-center`, textos centrados).
56. Pulido CSS global en **`src/index.css`**: **`::selection`** con fondo dorado semitransparente; **scrollbars** oscuros (`scrollbar-color` + estilos WebKit); reglas bajo **`prefers-reduced-motion: reduce`** para acortar animaciones y transiciones; **`a[href]:focus-visible`** con contorno oro. En **`Button`**, anillo **`focus-visible`** oro con `ring-offset-black` para teclado.
57. Convencion de documentacion explicitada (seccion **Convencion de documentacion** en este archivo) y sincronizacion de **`README.md`**, **`docs/design.md`**, **`docs/components.md`**, **`src/pages/README.md`** con el estado de UI descrito.
58. Entrenamientos: **`WorkoutForm`** con lista de ejercicios (una fila por ejercicio, añadir/quitar sin comas); visualizacion en **`WorkoutItem`** como lista numerada (`ol`); accion **Duplicar** que crea otro entreno mediante **`POST /workouts`** con titulo `"(copia)"` y recorte si supera **80** caracteres (limite backend). Sin cambios de contrato en API ni en `store.json`.
59. **Sesiones de entreno:** coleccion **`workoutSessions`** en `store` y API **`/api/workout-sessions`** (`GET` listar propias, `POST` registrar `workoutId` + `performedAt` opcional + `notes` max 500, `DELETE` propia). UI en **`WorkoutSessionsPanel`** + boton **Registrar sesion** en cada **`WorkoutItem`** (scroll al formulario). Tipos en `src/types/workoutSession.ts`, cliente `src/api/workoutSessionsApi.ts`. Tests **`workout-sessions.test.ts`**; `beforeEach` de otras suites limpia `workoutSessions`. Codigos de error en `errorMessages.ts` (`WORKOUT_SESSION_*`).
60. **Sesiones en perfil:** componente **`WorkoutSessionsHistory`** (lista reutilizable, opcion `showDelete`); **`ProfilePage`** carga **`getWorkoutSessions`** y muestra la misma actividad que en Entrenamientos en solo lectura, con texto que remite a la pestaña Entrenamientos para registrar o borrar.
61. **Resumen de sesiones en cada tarjeta de entreno:** en **`WorkoutsPage`** un `useMemo` agrega por `workoutId` el **conteo** de sesiones y la **ultima** `performedAt`; **`WorkoutItem`** muestra bloque "Sesiones" (ninguna / N sesiones + fecha ultima con **`formatSessionPerformedAt`**).
62. **Etiquetas en entrenamientos:** campo **`tags: string[]`** en `Workout` (store + API); **`sanitizeWorkoutTags`** en validacion (tope 12, longitud 20, sin duplicados case-insensitive); formulario **`WorkoutForm`** con lineas de etiquetas; **`WorkoutItem`** chips + **filtro por etiqueta** en `WorkoutsPage`; **`CreatePostForm`** muestra hasta 3 etiquetas en el desplegable de entreno vinculado.
63. **Feed a ancho util:** en **`FeedPage`** la columna principal deja de caparse a ~680px (`lg:grid-cols-[minmax(0,1fr)_…]`); **`App.tsx`** añade **`min-w-0 w-full`** en **`social-content`** para que la columna del grid use bien el espacio.
64. **Historias del gym (compacto):** tarjeta con **`max-w-sm`**, padding reducido, titulo y pestañas centrados; **`StoriesRow`** y **`FeedModeTabs`** con prop opcional **`compact`** (avatares y pills mas pequeños).
65. **`SiteFooter`:** componente **`src/components/layout/SiteFooter.tsx`**; **`App.tsx`** envuelve shell en **`flex min-h-screen flex-col`** con **`SiteFooter`** bajo el `main` (invitado y logueado). Contenido: copyright, texto MVP, enlace Trello **Roadmap**, enlaces **`/aviso-legal`**, **`/privacidad`**, **`/contacto`**. Rutas declaradas en **`src/RootRoutes.tsx`** junto al shell principal.
66. **Encabezado Inicio:** en **`FeedPage`**, bloque **`<header>`** encima de historias (rótulo GoI, **Inicio**, descripcion del feed y usuario conectado), estilo alineado a cards oscuras.
67. **Entrenamientos — lista y sesion:** **`WorkoutsPage`** — campo **buscar por titulo** (case-insensitive, combinable con etiqueta), **ordenar lista** (ultima sesion, mas sesiones, plantilla mas reciente, titulo A-Z); **`WorkoutSessionsPanel`** (registrar + historial) **debajo** de la card **Mis entrenamientos**; **`WorkoutItem`** boton **Registrar sesion** en variante **`primary`** y **`title`** de ayuda; mensaje vacio unificado si filtro titulo+etiqueta no devuelve filas.
68. **Documentacion:** sincronizados **`README.md`**, **`docs/design.md`**, **`docs/components.md`**, **`src/pages/README.md`** y esta seccion con los puntos 63–67.
69. **Vercel (API serverless):** **`vercel.json`** (`installCommand`, `buildCommand` → **`npm run vercel-build`**, `outputDirectory` `dist`, rewrite `/api/*` → funcion **`api/index.mjs`** que importa **`server/dist/app.js`**); **`includeFiles`** como **cadena** **`"server/dist/**"`** (el esquema de Vercel no admite array). Tras **`tsc`**, **`server/scripts/copy-store-for-dist.mjs`** copia **`store.json`** a **`server/dist/data/`** para el seed en serverless. En **`store.ts`**, si **`VERCEL`**, el JSON de trabajo va a **`/tmp/goi-store.json`** con copia inicial desde **`dist/data/store.json`**; variable opcional **`GOI_STORE_PATH`** (compatibilidad: **`FITSOCIAL_STORE_PATH`**). **`app.ts`** aplica **`trust proxy`** en produccion o Vercel. En **`auth.ts`**, si hay **`VERCEL`** y no hay **`JWT_SECRET`**, se usa un secreto JWT automatico derivado de **`VERCEL_URL`** / **`VERCEL_GIT_COMMIT_SHA`** (demo Hobby; seguir recomendando `JWT_SECRET` para datos reales). Documentacion en **`docs/deploy.md`** y **`server/.env.example`**.
70. **Rutinas: nuevo flujo de edicion + nomenclatura UX.** Se separa creacion de rutina en pantalla dedicada `WorkoutEditorPage` (overview -> editor -> volver), con breadcrumb visual `Rutinas / Crear`. En la UI: **rutina** = plantilla (`workout`) y **entrenamiento** = registro (`workout-session`). `WorkoutsPage` mantiene resumen + calendario + lista de rutinas y elimina temporalmente el bloque de registrar/historial para mejorar foco del flujo.

71. **Rutinas + catalogo + migas de pan (2026).**
    - **Flujo de navegacion:** panel **Rutinas** (`WorkoutsPage`) → **Editor de rutinas** (`WorkoutEditorPage`, crear o editar) → **Catalogo** (`ExerciseCatalogPage`) → opcional **Ficha del ejercicio** (`ExerciseDetailPage`). El catalogo solo se alcanza desde el editor (botones **Ver catalogo** / **Elegir ejercicios en el catalogo**); se elimino el acceso directo al catalogo desde la card "Crear rutina" del panel.
    - **`App.tsx`:** subvistas `workoutsView`: `overview` | `editor` | `catalog` | `exerciseDetail`. Estado `catalogFromEditor` y `exerciseDetailFromEditor` para textos de botones y **miga de pan** (segmento intermedio **Editor de rutinas** cuando el usuario llego desde el editor). Al cerrar sesion se limpian flags y borrador de rutina.
    - **Miga de pan:** Editor `Rutinas / Editor de rutinas / Nueva rutina | Editar rutina`; Catalogo (desde editor) `Rutinas / Editor de rutinas / Nueva rutina | Editar rutina / Catalogo`; Ficha `Rutinas / Editor de rutinas / Nueva rutina | Editar rutina / Catalogo / <ejercicio>`.
    - **Persistencia creacion:** `src/utils/workoutCreateDraft.ts` escribe en `sessionStorage` durante modo crear; se fusionan ejercicios elegidos al volver del catalogo con `initialExerciseIds`; se borra el borrador al **guardar** rutina nueva o al **logout** (no al pulsar Volver al panel).
    - **Documentacion** sincronizada: `README.md`, `docs/design.md`, `docs/components.md`, `src/pages/README.md`, esta entrada.

72. **Detalle por ejercicio en catalogo:** modelo `Exercise` ampliado con `equipment`, `description`, `instructions` (backend `store.ts` + semilla `server/src/data/exerciseDetails.ts`). Fusion en `mergeExerciseCatalog`; UI: lista del catalogo muestra resumen (`line-clamp-2`); ficha (`ExerciseDetailPage`) muestra equipamiento, ejecucion multilinea y grupos musculares. Tests `exercises.test.ts` comprueban respuesta con texto.

73. **Historias (reels) + sesiones consistentes.** Persistencia **`storyReels`** en store; API **`GET|POST /api/stories`** (JWT); caducidad en servidor (~24 h). Cliente `storiesApi`, componentes **`StoriesRow`**, **`CreateStoryModal`**, **`StoryViewerModal`**; uso de `storySeen` en `localStorage` para anillo «no visto». Escrituras con JWT cuyo `userId` no existe en store (dato reiniciado, token viejo): **`401` + `AUTH_SESSION_STALE`** en posts/historias; mensaje user-facing en `errorMessages`; expiracion forzada en `api/client.ts`. Scripts demo: **`server/scripts/reset-demo-users.ts`** + comando **`npm run reset:demo-users`** (desde **`server/`** o raiz via `npm run reset:demo-users`), upsert de `DEMO_USERS` con password `123456`; **`seed-demo-users`** sigue siendo «solo si falta email**. Documentacion en **`README.md`**, **`docs/design.md`**, **`docs/deploy.md`** (operativa reload del API tras tocar disco).

74. **Roadmap personal (`/roadmap`).** Pagina **`PersonalRoadmapPage`**, ruta en **`RootRoutes.tsx`**; pie **`SiteFooter`** enlaza **`/roadmap`**. Backend **`GET|PUT /api/personal-roadmap`** (sin JWT), fichero **`server/data/personal-roadmap.json`** (`personalRoadmapFile.ts`). Cliente: **`fetchPersonalRoadmap`**, **`savePersonalRoadmap`**, utilidades **`personalRoadmap`** (`goi:personalRoadmap:v1` en **`localStorage`**). **Guardado solo bajo demanda** (**Guardar cambios**): escribe copia local y API si responde; aviso de cambios pendientes y **`beforeunload`** cuando hay ediciones sin guardar. Diagrama **`RoadmapDiagram`** con conectores SVG imperativos. Documentacion en **`README.md`**, **`docs/design.md`**, **`docs/components.md`**, **`src/pages/README.md`**.

75. **Feed — sidebar extraído a componente reutilizable.** Se creó **`src/components/feed/FeedSidebar.tsx`** para encapsular la barra lateral derecha del feed (resumen de cuenta + sugerencias + acciones de seguir/ver perfil). **`FeedPage.tsx`** delega ese bloque en `FeedSidebar`, reduciendo tamaño de la página y dejando preparado el terreno para futuras extracciones del layout de Inicio. Documentación sincronizada en **`docs/components.md`** y este archivo.

76. **Layout global de contenido (más margen lateral).** Para separar las vistas principales de los bordes de la ventana, se añadió **`src/components/layout/PageContainer.tsx`** y se aplicó en **`App.tsx`** sobre el contenido autenticado (Feed/Rutinas/Perfil). Resultado: ancho máximo común (**`max-w-6xl`**) + padding lateral consistente, sin tocar la lógica de cada pantalla. Documentación sincronizada en **`docs/design.md`**, **`docs/components.md`** y este archivo.

77. **Ajuste fino de posición del contenido principal.** Para mejorar el equilibrio visual con la sidebar, `PageContainer` desplaza ligeramente el bloque de páginas hacia la derecha en escritorio (padding asimétrico: `lg:pl-6`, `lg:pr-4`). En móvil y tablet pequeña se mantiene centrado sin cambios de comportamiento.

78. **Refuerzo responsive en móviles estrechos.** Se pulió la UI para evitar compresión de controles: `SidebarNavigation` pasa a **1 columna** bajo ~430 px; `WorkoutsPage` muestra el bloque de resumen en **1 columna** bajo ~460 px; `WorkoutItem` y acciones de posts en `ProfilePage` apilan botones en <480 px; `SiteFooter` centra contenido y oculta separadores `·` cuando los enlaces hacen wrap. Documentación sincronizada en **`docs/components.md`**, **`docs/design.md`**, **`src/pages/README.md`** y este archivo.

79. **Mobile-first ampliado (feed + formularios + acciones).** Segunda pasada responsive para teléfonos: `FeedPage` reduce paddings/gaps en móvil; `PostItem` compacta tarjeta y evita separadores visuales en anchos ultra estrechos; `PostActions` y `MentionComposer` pasan a disposición vertical en <480 px; `CreatePostForm` adapta bloque de fotos/CTA a ancho completo en móvil; `FeedNotificationsBell` ajusta tamaño de botón y ancho del panel al viewport; `StoriesRow` reduce ligeramente avatar en móvil; `ProfileForm` usa CTA full-width en pantallas pequeñas; `WorkoutSessionCalendar` reorganiza cabecera en anchos reducidos. Documentación sincronizada en **`docs/components.md`**, **`docs/design.md`**, **`src/pages/README.md`** y este archivo.

80. **Pulido táctil (objetivos ~44 px).** Se reforzó accesibilidad móvil en controles interactivos: `Button` adopta `min-h-11` global; `.goi-field` también usa `min-h-11`; `FeedModeTabs` garantiza altura táctil en ambos modos; `FeedNotificationsBell` pasa a botón de ~44 px; toggle de comentarios en `PostItem` aumenta zona tocable. Objetivo: menos taps fallidos y mejor ergonomía en teléfonos sin cambiar contratos ni flujos funcionales.

81. **Crear publicación — UX reforzada.** Se añadió borrador automático por usuario en `sessionStorage` (**`goi:postCreateDraft:v1`**) para texto + visibilidad + rutina seleccionada; al volver a la pestaña se recupera el estado del compositor. Además, validación en vivo (mensaje guía previo al submit) y botón de publicar inteligente (`canSubmit`). `CreatePostForm` incorpora una vista previa compacta (texto, rutina, nº de fotos y visibilidad) para reducir ediciones posteriores.

82. **Composer móvil fullscreen para publicaciones.** En `FeedPage`, en pantallas pequeñas (`sm:hidden`) la card de “Crear publicación” muestra CTA **Abrir editor** y abre un modal de pantalla casi completa (overlay + panel inferior con scroll) reutilizando `CreatePostForm`. En escritorio se mantiene el formulario inline sin cambios. Al publicar con éxito desde móvil, el modal se cierra automáticamente.

83. **Crear publicación por launcher (sin card inline).** Se reemplaza la card “Crear publicación” por accesos directos: botón **Publicar** en cabecera de `FeedPage` y **FAB** (`+`) en móvil. Ambos abren un único modal responsive con `CreatePostForm` (fullscreen en móvil, centrado en escritorio). Se mantiene borrador/validación/preview del paso 81.

84. **Launcher desktop minimalista con tooltip.** Ajuste visual en `FeedPage`: en escritorio el acceso a crear post pasa a icono `+` sin texto (con `title` + tooltip visible en hover/focus), manteniendo accesibilidad (`aria-label` y texto `sr-only`). En móvil sigue el FAB `+`.

85. **Pack 1+2 de creación de publicaciones (seguridad de cierre + descarte explícito).** `FeedPage` ahora protege el cierre del modal de composición: si hay cambios pendientes (texto/fotos/rutina/visibilidad), al cerrar por overlay o botón aparece confirmación para evitar cierres accidentales. Además, se añadió botón **Descartar borrador** en la cabecera del modal; pide confirmación, limpia el estado del compositor y borra `goi:postCreateDraft:v1` antes de cerrar.

86. **Pack 3 de creación de publicaciones (progreso visual de compresión/subida).** Se añadió estado de transferencia en el compositor de `FeedPage`: al adjuntar fotos se muestra progreso de compresión (`compressManyImageFiles` ahora reporta avance), y al publicar se presenta barra/porcentaje de subida con mensajes de estado. Mientras hay proceso en curso se bloquean acciones sensibles (publicar, adjuntar y quitar fotos) para evitar envíos duplicados o inconsistencias. Si falla la publicación, se mantiene el borrador y se muestra mensaje explícito de reintento.

87. **Pack 4 de creación de publicaciones (reordenar imágenes + portada).** En `CreatePostForm` se añadieron controles por miniatura para mover imágenes a izquierda/derecha y acción **Portada** para priorizar una imagen. En `FeedPage`, estas acciones reordenan `draftImages` en cliente y la portada se materializa como **primera imagen** del array `media` enviado al backend (sin cambiar contrato API). La vista previa ahora muestra también el nombre de la portada seleccionada.

88. **Pack 5 de creación de publicaciones (recorte básico de imágenes).** Se añadió acción `Recorte 1:1` por miniatura en `CreatePostForm`. `FeedPage` aplica un recorte cuadrado centrado sobre la imagen seleccionada antes de publicar, manteniendo calidad/compresión JPEG del flujo actual y sin cambiar el contrato de `POST /api/posts`. Durante el recorte se reutiliza el estado visual de procesamiento para feedback al usuario.

89. **Pack 5.1 (recorte manual dentro del compositor).** Evolución del recorte básico: la acción de recorte abre un mini-editor modal 1:1 con controles de **zoom** y desplazamiento **horizontal/vertical**, preview en tiempo real y botón **Aplicar recorte**. Técnicamente se añadió `cropDataUrlToSquare` con opciones (`zoom`, `offsetX`, `offsetY`) en `postImages.ts`; `FeedPage` guarda el resultado en la imagen del borrador sin cambios de contrato hacia backend.

90. **Pack 5.2 (gesto drag para encuadre).** En el editor de recorte manual de `FeedPage`, la vista previa ahora permite arrastrar directamente (pointer events, compatible táctil/ratón) para mover el encuadre X/Y de forma natural. Los sliders se mantienen para ajuste fino.

91. **Pack 5.3 (pinch-to-zoom en recorte).** En el mismo editor de recorte, se añadió gesto de pellizco con dos dedos sobre la preview para ajustar el zoom dinámicamente (rango 1x-3x). Se conserva drag para desplazar encuadre y sliders para microajuste.

92. **Feed móvil — reubicación de “Tu cuenta / Sugerencias”.** Para evitar solape visual con el FAB de crear publicación, `FeedSidebar` se renderiza en móvil dentro de la columna principal (debajo de historias) y en desktop permanece en el lateral derecho. Se añadió `className` opcional al componente para controlar visibilidad por breakpoint y se reservó `padding-bottom` en la columna principal móvil para despejar el CTA flotante.

93. **Checklist publicaciones — menciones priorizadas (seguidos + recientes).** Se mejoró el autocompletado `@` en `MentionableTextarea`: mantiene navegación teclado y ahora prioriza candidatos seguidos y recientemente mencionados. `FeedPage` guarda historial reciente por usuario en `localStorage` (`goi:mentionRecents:v1:{userId}`) cuando se selecciona una mención desde el compositor o comentarios, y lo usa para ordenar sugerencias de forma más útil.

94. **Checklist publicaciones — atajos/plantillas rápidas.** En `CreatePostForm` se añadieron chips de texto rápido (`PR`, `Check-in`, `Resumen`, `Pregunta`) para acelerar redacción. Al aplicar una plantilla: si el contenido está vacío se inserta completo; si ya hay texto se añade debajo con separación, respetando el flujo de validación y borrador existente.

95. **Tests (publicaciones) — cobertura utilitaria en frontend.** Se habilitó `vitest` en la raíz (`npm test`) y se añadieron pruebas unitarias para piezas clave del flujo de publicación: prioridad de menciones (`mentionAutocomplete.test.ts`, seguidos + recientes + filtro por query) y aplicación de plantillas rápidas (`postComposerTemplates.test.ts`). Además, `FeedPage` reutiliza la utilidad testeada `applyPostTemplate`.

96. **Fase visual 1 (quick wins) — creador + cards de publicación.** Sin tocar lógica de negocio, se mejoró jerarquía visual del compositor (`CreatePostForm`) agrupando secciones en superficies con borde/sombra suave (texto, fotos, visibilidad, rutina). En timeline, `PostItem` refuerza lectura con cabecera y cuerpo más estructurados; `PostActions` y `PostMediaGallery` pasan a bloques visuales más consistentes para un look más “card premium”.

97. **Ajuste UX textarea (compositor/comentarios).** Se refinó el estilo del cuadro de texto principal de publicación (más alto y superficie visual más limpia) y se desactivó el resize manual en campos de mención para evitar el efecto de “abrir/cerrar” textarea que rompía la composición visual.

98. **Textarea compositor — mayor presencia + auto-grow.** Se habilitó crecimiento automático de altura en `MentionableTextarea` (`autoGrow`) y se aplicó en el campo principal de `CreatePostForm`, aumentando además su altura base para ocupar casi toda la tarjeta de texto y mejorar confort de escritura.

99. **Compositor por fases (wizard v1).** Se transformó `CreatePostForm` en flujo guiado de 4 pasos: **Contenido**, **Multimedia**, **Configuración** y **Revisión**. Se añadió stepper visual con navegación `Atrás / Siguiente / Publicar`, manteniendo el mismo estado de borrador/validaciones/adjuntos existente para iterar el diseño sin romper lógica.

100. **Ajuste visual navegación de pasos.** En el wizard de `CreatePostForm`, los botones `Atrás / Siguiente` se movieron al borde inferior del formulario sin caja contenedora adicional, eliminando el rectángulo envolvente para un cierre visual más limpio.

101. **Modal compositor sin scroll interno + lienzo ampliado.** Se eliminó el `overflow-y-auto` del contenedor del editor de publicaciones y se incrementaron dimensiones del modal (móvil y desktop) para ofrecer más área visible de diseño sin desplazamiento interno.

102. **Wizard v2 según feedback (flujo 3 fases).** Se reordenó `CreatePostForm` a: (1) **Imagen + edición**, (2) **Texto/menciones + configuración**, (3) **Revisión**. Además, tras añadir imágenes se mantiene una vista principal grande (portada) visible durante todo el flujo para acercar cada fase al resultado final de la publicación.

103. **Fase 1 — navegación visual de multimedia.** En el lienzo principal de imagen se añadieron controles de flecha izquierda/derecha para recorrer los archivos cargados y previsualizarlos sin salir del paso. El menú contextual `+` ahora actúa sobre el archivo actualmente visible (editar/eliminar).

104. **Editor de foto — mejoras de precisión y comparación.** Se reforzó el editor de recorte con presets rápidos de zoom, mini panel de comparación **original vs recorte**, y controles de ajuste fino por flechas (nudge) para mover encuadre con más precisión además de drag/pinch/sliders.

105. **Editor de foto en barra lateral derecha.** El recorte dejó de abrirse como overlay/popup independiente y ahora se edita desde un panel lateral derecho dentro del propio entorno del compositor, manteniendo contexto visual del flujo por fases.

106. **Carpeta `src/hooks/` y documentación de hooks.** Se extrajo `useMentionRecents` (menciones recientes en `localStorage`) desde `FeedPage`; `useRegisterRoadmapNode` y el contexto `RoadmapRegistryContext` quedaron modularizados para el diagrama del roadmap personal. Documentación de `useState`, `useEffect`, `useMemo`, `useCallback` y enlaces al código en **`docs/hooks.md`**.

107. **Documentación de hooks ampliada (`docs/hooks.md`).** Tabla checklist con rutas de archivo, sección de **ejemplos citados** (`FeedPage`, `useMentionRecents`, `useRegisterRoadmapNode`) para entrega / corrección sin buscar a mano.

108. **Documentación de Context API (`docs/context.md`).** Cuándo conviene usar contexto frente a props/estado local; descripción de **`AuthContext`**, **`ThemeContext`** y **`RoadmapRegistryContext`**; orden de providers (`ThemeProvider` en `main.tsx`, `AuthProvider` en `App.tsx`); enlaces al código y referencia cruzada con `docs/hooks.md`.

109. **Rutas y 404.** `RootRoutes` monta **`/` → App**, rutas legales y **`/roadmap`**, y **`path="*"` → NotFoundPage`** (`src/pages/NotFoundPage.tsx`). Documentación en **`docs/routing.md`** y enlace en **`README.md`**.

110. **Formularios (`docs/forms.md`).** Documentación de formularios controlados, validación (auth, perfil, compositor), **`StatusMessage`** y ejemplos citados del código; enlace en **`README.md`**.

111. **API REST (`docs/api.md`).** Documentación dedicada: base URL, cabecera **`Authorization: Bearer`**, formato **`{ code, message }`**, tabla de archivos del backend y **ejemplos JSON** por recurso (health, auth, workouts, posts, roadmap, etc.); referencia cruzada con **`docs/design.md`** y **`docs/deploy.md`**; enlace en **`README.md`**.

112. **Capa de red frontend (`docs/api-client.md`).** Documentación de **`apiFetch`**, **`ApiError`**, evento **`auth:expired`**, tabla de **`src/api/*.ts`**, **`src/types/`**, estados de red en UI y nota sobre persistencia local vs API; enlaces **`README.md`** y **`docs/design.md`** (flujo de datos).

113. **Testing (`docs/testing.md`).** Vitest en raíz (`mentionAutocomplete`, `postComposerTemplates`) y en **`server/`** (auth/workouts, exercises, posts seguridad, sesiones, historias); comandos **`npm run test`**, **`npm run build`**, **`npm run lint`**; checklist manual (auth, feed, compositor, perfil, rutas legales, 404, responsive/consola); enlace en **`README.md`**.

114. **Despliegue y URLs.** Creado **`docs/deployment.md`** como entrada que enlaza la guía completa **`docs/deploy.md`** (requisito nombre `deployment.md`). En **`README.md`**, sección **Despliegue**: tabla **Producción (URLs)** con placeholders para front y nota API mismo origen / `VITE_API_URL`; comprobación **`GET /api/health`**.

115. **Retrospectiva (`docs/retrospective.md`).** Documento de cierre: revisión de docs API/red, síntesis React + Express + cliente HTTP, tabla de problemas típicos, sección de uso de IA y reflexión final con bloques *[Personalizar]*; enlace en **`README.md`**.

116. **Marca por tema (ThemeContext) y assets PNG.** `src/utils/brandingLogo.ts` devuelve la ruta del logo según `theme`: **Legacy** → `/branding/goi-logo-mark.png`; **Encendido** → `goi-logo-theme-encendido.png`; **Healthy** → `goi-logo-theme-healthy.png`; **Neon** → `goi-logo-theme-neon.png` (todos bajo `public/branding/`). El archivo **mark** es el que debe sustituirse para cambiar solo el logo Legacy (sin renombrar rutas en código).

117. **Pantalla de login / hero de marca (`GoISidebarBadge` + `LoginHeroBrand`).** Con `presentation="hero"` y `heroHalo`, el PNG del logo rellena el círculo con **`object-cover`**, posición centrada y ligera **`scale`** para recortar márgenes del PNG; en temas claros (`light:`) se aplica **`mix-blend-multiply`** para suavizar fondos opacos del asset. El anillo del logo conserva **`overflow-hidden`** y sombras; el **halo** animado (`.goi-hero-halo` en `index.css`) mantiene tamaño **188×188** px (móvil) y **236×236** px (`sm`). Modo **compact** (sidebar): imagen **`object-contain`** en porcentaje del anillo, sin halo.

118. **Registro: token + usuario alineados en cliente y servidor.** `POST /api/auth/register` responde **201** con **`user`** (sanitizado) y **`token`** JWT (`signAuthToken(user.id)`), además de `message` (`authController.register`). En **`AuthPage`**, tras `register()`, si la respuesta incluye **`reg.token` y `reg.user`** se llama a **`setAuth(reg.token, reg.user)`**; si no (compatibilidad), se hace **`login`** y se usa **`loginResponse.user`** con el token de login para evitar desajuste `sub` del JWT vs objeto usuario y errores de tipo «perfil inexistente» tras crear cuenta.

119. **Feed — «Ir al perfil» desde la cuenta propia.** `UserPublicProfileModal` no abre modal cuando `userId === currentUserId`. **`App.tsx`** pasa **`onGoToOwnProfile`** a **`FeedPage`**, que reenvía **`onGoToProfile`** a **`FeedSidebar`** / **`UserSummaryCard`**: al pulsar **Ir al perfil** con la sesión actual se limpia visita de perfil externo y se navega a la pestaña **Perfil** (`goTo("profile")`), sin quedar en un modal vacío.

120. **Estadísticas — mapa corporal muscular.** Pestaña **Estadísticas** (`StatisticsPage` → **`StatisticsPersonalTab`**). Componente **`MuscleBodyGlowMapBasic`**: siluetas frontal/dorsal con resaltado por intensidad según datos de sesiones; mapeo de zonas SVG ↔ ejes del octágono en **`src/utils/muscleBodyMapSvgZones.ts`** (`MUSCLE_MAP_AXIS_TO_SVG_IDS`, `MUSCLE_MAP_PATH_FALLBACK_LABEL`). Existe además **`MuscleBodyGlowMap.tsx`** (variante con más detalle SVG). Documentación cruzada en **`docs/components.md`** y **`src/pages/README.md`**.

121. **Persistencia de usuarios (recordatorio operativo).** Los usuarios creados por registro se añaden a **`store.users`** y se escriben en el JSON configurado por **`getDataFilePath()`** (por defecto **`server/data/store.json`**; variables **`GOI_STORE_PATH`** / **`FITSOCIAL_STORE_PATH`**; en Vercel **`/tmp/goi-store.json`**). Tras editar el JSON a mano o seed, reiniciar el proceso del API.

122. **Shell claro y variable CSS `--goi-page-bg`.** `App.tsx`, **`SiteFooter`** y **`LoginHeroBrand`** usan `light:bg-[var(--goi-page-bg)]` y **`light:focus-visible:ring-offset-[var(--goi-page-bg)]`** para alinear fondo y anillo de foco en temas **Encendido / Healthy**. Valores definidos en **`src/index.css`**: Encendido **`#f5f1ed`**, Healthy **`#f6f7f6`** (ajustables en un solo sitio).

## Usuarios demo y fichero JSON (operativa rapida)

| Objetivo | Comando |
|----------|---------|
| Crear demo solo cuando el email **no** exista | `npm run seed:demo-users` (raiz) o dentro de **`server/`** |
| Dejar demo en estado conocido (**upsert**, resetea passwords a **`123456`**) | `npm run reset:demo-users` (raiz) o dentro de **`server/`** |

Tras modificar **`server/data/store.json`** (seed, reset o editor), **reinicia el proceso del API**: el servidor lee el JSON al arrancar. Confirma con **`GET /api/health`** (`devStore.usersLoaded`). Si **`GOI_STORE_PATH`** (o **`FITSOCIAL_STORE_PATH`**) apunta a otro archivo, el seed usa esa misma ruta al ejecutarse desde el mismo proceso de Node (y el API en marcha debe apuntar al mismo fichero para evitar sorpresas).

## Recuperacion de contraseña (resumen operativo)

| Entorno | Comportamiento |
|---------|----------------|
| Produccion | El usuario recibe el mismo mensaje generico tras solicitar reset; hace falta integrar envio de email con el token (Fase 2). El token no se expone en la respuesta JSON. |
| Desarrollo local | Opcional: `AUTH_RESET_RETURN_TOKEN=true` en `server/.env` para que la respuesta incluya `devResetToken` y poder abrir `http://localhost:5173/?reset=...` y completar el flujo sin correo. |

## Proxima accion inmediata

- Integrar proveedor de email (enlace firmado en el correo) o continuar con mejoras UX priorizadas tras la validacion con usuarios.
