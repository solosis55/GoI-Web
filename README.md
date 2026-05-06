# FitSocial · GoI (Group of Iron)

Web tipo **red social + deporte**: publicar progreso en un feed comunitario, llevar **entrenamientos**, edición de **perfil** y relaciones básicas (**seguir usuarios**, likes y comentarios). El nombre de producto en la UI es *FitSocial*; el proyecto de idea y planificación se relaciona con **GoI (Group of Iron)**.

**Seguimiento y tareas:** tablero en Trello — [https://trello.com/b/6Yn18TWn/red-social-goi](https://trello.com/b/6Yn18TWn/red-social-goi)

## Alcance actual (MVP)

- Registro, inicio de sesión, sesión persistida en el cliente (JWT).
- Recuperación de contraseña preparada en API y flujo en pantalla de auth (en producción falta integrar envío de correo; en local ver `server/.env.example` y `AUTH_RESET_RETURN_TOKEN`).
- Feed con publicaciones, filtro “Todos / Seguidos”, likes y comentarios; **Inicio** con encabezado de pagina, historias en tarjeta compacta y columna principal del feed que aprovecha el ancho en pantallas grandes.
- **Pie de pagina** global (`SiteFooter`): copyright FitSocial · GoI, enlace al roadmap en Trello y textos legales/contacto reservados para futuras paginas.
- CRUD de **rutinas** por usuario: ejercicios enlazados al **catalogo** (`exerciseIds`), **etiquetas** por lineas, **busqueda por titulo**, **ordenar** la lista, filtro por etiqueta, duplicar rutina.
- **Catalogo de ejercicios** en API (`GET /api/exercises`, `GET /api/exercises/:id`): datos en `store.json` (`exercises`), JWT obligatorio; cada ejercicio puede incluir **equipamiento**, **descripcion** y **instrucciones de ejecucion** (semilla en `server/src/data/exerciseDetails.ts`). Flujo UX lineal: **Rutinas → Editor de rutinas → Nueva rutina (o Editar rutina) → Catalogo → ejercicio** (sin boton de catalogo en el listado de rutinas). Borrador de creacion de rutina en **`sessionStorage`** (`fitsocial:workoutCreateDraft`) para no perder titulo, descripcion, ejercicios y etiquetas al cambiar de pestaña o vista.
- **Sesiones de entreno:** registrar cuando se hizo una plantilla (fecha/hora, notas) y ver historial; API `GET|POST /api/workout-sessions`, `DELETE /api/workout-sessions/:id` (JWT). El historial también se muestra en **Perfil** (solo lectura).
- Perfil deportivo (usuario, bio, objetivo, avatar).
- API con validación, rate limit en auth y tests de seguridad básicos (`server`).

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, `react-router-dom` (uso principal: shell por pestañas) |
| Backend | Node.js, Express 5, TypeScript, JWT, bcrypt, persistencia en **`server/data/store.json`** |
| Calidad | ESLint (raíz), Vitest + supertest (`server`) |

## Requisitos

- **Node.js** 22+ recomendado (LTS actual). Comprueba con `node -v`.

## Desarrollo local

1. **Instalar dependencias** (desde la raíz del repo):

   ```bash
   npm install
   cd server && npm install && cd ..
   ```

2. **Variables del servidor** (opcional en local): copia `server/.env.example` a `server/.env` y ajusta. Para JWT en entornos cercanos a producción define `JWT_SECRET`.

3. **Arrancar**:

   - Frontend: en la raíz, `npm run dev` → suele quedar en `http://localhost:5173`.
   - Backend: en la carpeta `server`, `npm run dev` → API en `http://localhost:4000` (puerto configurable con `PORT`).

   El cliente usa por defecto `http://localhost:4000/api` en modo desarrollo (`src/api/client.ts`).

## Usuarios de prueba (datos locales)

En el fichero **`server/data/store.json`** del repo hay cuentas pensadas para **desarrollo y demos** (misma contraseña para todas). **No uses estas credenciales en producción** ni expongas datos reales en un `store.json` público.

| Usuario   | Email               | Contraseña |
|-----------|---------------------|--------------|
| `alice`    | `alice@test.com`     | `123456`     |
| `bob`      | `bob@test.com`       | `123456`     |
| `cristian` | `cristian@test.com`  | `123456`     |
| `dana`     | `dana@test.com`      | `123456`     |

Las cuatro cuentas se crean con **objetivo y bio de ejemplo** (datos públicos coherentes para demos). Si borras o sustituyes `store.json`, dejan de existir hasta registrar de nuevo o restaurar el fichero. Para recrear solo estas cuentas: en la raíz del repo, `npm run seed:demo-users` (o dentro de `server/`, igual); el script **solo añade** registros cuyo **email** aún no esté en el store. Si quieres dejar las cuentas demo en un estado conocido (incluida la contraseña `123456`), usa **`npm run reset:demo-users`**: hace upsert de las cuatro y restablece su perfil/credenciales según `server/src/data/demoUsers.ts`. **`npm test` en `server/` no escribe cambios en `store.json`** (Vitest usa el store en memoria). Si un `store.json` antiguo quedó solo con usuarios ficticios de pruebas, vacía `"users": []` y ejecuta el seed para volver a las cuatro cuentas. **Tras seed/reset o editar `store.json`**, reinicia el API (`npm run dev` en `server/`): el fichero solo se lee al arrancar. Si el login con `*@test.com` / `123456` dice “incorrectos”, el proceso del API seguramente lleva datos viejos en memoria (no recargó el JSON): cierra ese terminal o mata el puerto **`4000`** y vuelve a levantar el servidor. En local, **`GET http://localhost:4000/api/health`** incluye **`devStore.usersLoaded`**: debe coincidir con el número de cuentas esperadas en `store.json` (las cuatro demo → `4`). Si el login falla, en consola verás usuarios cargados y ruta; comprueba también que el front apunte al API (`http://localhost:4000/api` por defecto, o `VITE_API_URL` en build).

**Vercel:** si no configuras **`JWT_SECRET`**, el servidor usa un secreto automático derivado de variables que Vercel inyecta (`VERCEL_URL`, etc.) para que el login funcione en demos. Para **dominio propio o datos sensibles**, define siempre **`JWT_SECRET`** en el dashboard y redeploy. Detalle en **`docs/deploy.md`**.

## Scripts útiles (raíz)

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo Vite (frontend). |
| `npm run build` | Build del frontend (`dist/`). |
| `npm run build:server` | Compila solo el backend (`server/dist/`). |
| `npm run build:deploy` | Build frontend + backend (listo para un solo proceso o Docker). |
| `npm run start:deploy` | Ejecuta `node server/dist/server.js` (**desde la raíz del repo**, con `NODE_ENV=production` y frontend ya construido). |
| `npm run lint` | ESLint sobre el frontend. |
| `npm run seed:demo-users` | Crea en `server/data/store.json` las cuentas de prueba del README (si faltan). |
| `npm run reset:demo-users` | Restaura las cuentas demo (upsert) y vuelve sus passwords al valor del seed. |

En `server/`: `npm test` ejecuta Vitest.

## Marca visual (GoI)

Logotipo en **`public/branding/goi-logo.png`** (reemplaza el archivo para actualizar la imagen). En la sidebar se muestra dentro de un **círculo** (contenedor con anillo dorado suave), **tamaño contenido** y bloque de marca **centrado** en el lateral. Los colores de acento en UI usan tokens Tailwind **`goi-gold` / `goi-steel`** en **`src/index.css`** (`@theme`), más la clase **`.goi-field`** para campos sobre fondos oscuros. Pulido global: **selección de texto** con tinte oro, **scrollbars** oscuros, **`prefers-reduced-motion`** y **focus-visible** (enlaces y botones). Detalle en **`docs/design.md`**.

## Documentacion al cambiar el proyecto

Cualquier cambio sustancial debe dejarse reflejado en los docs del repo: **`README.md`**, **`docs/project-management.md`**, **`docs/design.md`**, **`docs/components.md`** y **`src/pages/README.md`** cuando toque (lista explícita en project-management).

## Despliegue

Guía detallada (variables, Docker, persistencia de `store.json`, checklist): **[docs/deploy.md](./docs/deploy.md)**. Incluye **Vercel** con `vercel.json` + función `api/index.mjs` (mismo dominio para SPA y `/api`).

## Documentación en el repo

- [docs/idea.md](./docs/idea.md) — visión GoI y funcionalidades planteadas (incluye enlace a la convención de docs).
- [docs/project-management.md](./docs/project-management.md) — estado del MVP, checklist, **convención de documentación** y decisiones recientes.
- [docs/design.md](./docs/design.md) — arquitectura, API, tokens de marca y convenciones de front.
- [docs/components.md](./docs/components.md) — componentes reutilizables.

## Estructura rápida

```text
├── src/              # React (páginas, componentes, api, context)
├── server/src/       # Express (rutas, controladores, servicios, tests)
├── server/data/      # store.json (persistencia local del MVP)
├── docs/             # Documentación de producto y técnica
└── public/           # Estáticos públicos del frontend (favicon, etc.)
```

## Estado

MVP en evolución; la base de datos en fichero JSON es adecuada para pruebas y demos. Para producción a medio plazo conviene **volumen persistente** en el host o migración a una base de datos gestionada.
