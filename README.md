# FitSocial · GoI (Group of Iron)

Web tipo **red social + deporte**: publicar progreso en un feed comunitario, llevar **entrenamientos**, edición de **perfil** y relaciones básicas (**seguir usuarios**, likes y comentarios). El nombre de producto en la UI es *FitSocial*; el proyecto de idea y planificación se relaciona con **GoI (Group of Iron)**.

**Seguimiento y tareas:** tablero en Trello — [https://trello.com/b/6Yn18TWn/red-social-goi](https://trello.com/b/6Yn18TWn/red-social-goi)

## Alcance actual (MVP)

- Registro, inicio de sesión, sesión persistida en el cliente (JWT).
- Recuperación de contraseña preparada en API y flujo en pantalla de auth (en producción falta integrar envío de correo; en local ver `server/.env.example` y `AUTH_RESET_RETURN_TOKEN`).
- Feed con publicaciones, filtro “Todos / Seguidos”, likes y comentarios; **Inicio** con encabezado de pagina, historias en tarjeta compacta y columna principal del feed que aprovecha el ancho en pantallas grandes.
- **Pie de pagina** global (`SiteFooter`): copyright FitSocial · GoI, enlace al roadmap en Trello y textos legales/contacto reservados para futuras paginas.
- CRUD de entrenamientos por usuario (ejercicios y **etiquetas** por lineas, **busqueda por titulo**, **ordenar** la lista, filtro por etiqueta, duplicar rutina).
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
| `alice`   | `alice@test.com`    | `123456`     |
| `bob`     | `bob@test.com`      | `123456`     |
| `cristian`| `cristian@test.com` | `123456`     |
| `dana`    | `dana@test.com`     | `123456`     |

Si borras o sustituyes `store.json`, estas cuentas dejan de existir hasta que vuelvas a registrar usuarios o restaures el fichero.

## Scripts útiles (raíz)

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo Vite (frontend). |
| `npm run build` | Build del frontend (`dist/`). |
| `npm run build:server` | Compila solo el backend (`server/dist/`). |
| `npm run build:deploy` | Build frontend + backend (listo para un solo proceso o Docker). |
| `npm run start:deploy` | Ejecuta `node server/dist/server.js` (**desde la raíz del repo**, con `NODE_ENV=production` y frontend ya construido). |
| `npm run lint` | ESLint sobre el frontend. |

En `server/`: `npm test` ejecuta Vitest.

## Marca visual (GoI)

Logotipo en **`public/branding/goi-logo.png`** (reemplaza el archivo para actualizar la imagen). En la sidebar se muestra dentro de un **círculo** (contenedor con anillo dorado suave), **tamaño contenido** y bloque de marca **centrado** en el lateral. Los colores de acento en UI usan tokens Tailwind **`goi-gold` / `goi-steel`** en **`src/index.css`** (`@theme`), más la clase **`.goi-field`** para campos sobre fondos oscuros. Pulido global: **selección de texto** con tinte oro, **scrollbars** oscuros, **`prefers-reduced-motion`** y **focus-visible** (enlaces y botones). Detalle en **`docs/design.md`**.

## Documentacion al cambiar el proyecto

Cualquier cambio sustancial debe dejarse reflejado en los docs del repo: **`README.md`**, **`docs/project-management.md`**, **`docs/design.md`**, **`docs/components.md`** y **`src/pages/README.md`** cuando toque (lista explícita en project-management).

## Despliegue

Guía detallada (variables, Docker, persistencia de `store.json`, checklist): **[docs/deploy.md](./docs/deploy.md)**.

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
