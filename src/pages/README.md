# pages

Vistas principales de la aplicacion (shell por pestañas en `App.tsx`, sin router de URL para el area autenticada). El shell incluye **`SiteFooter`** bajo el `main` (invitado y logueado): ver `docs/components.md`.

## `AuthPage.tsx`

Presentacion: mismo **layout** (`social-shell`) con **`GoISidebarBadge`** (logo circular `public/branding/goi-logo.png`, rótulo FitSocial, bloque centrado en la sidebar); panel central **`Card tone="dark"`**, campos con clase **`.goi-field`** (foco **oro**), labels en **neutral claro** y **`StatusMessage tone="dark"`**.

Flujos:

- **Registro / login**: formulario unificado; contraseña minimo 6 caracteres (alineado con backend).
- **¿Olvidaste tu contraseña?** (solo en login): solicitud con email; mensaje generico siempre (no se indica si el correo existe).
- **Nueva contraseña**: se abre cuando la URL incluye `?reset=<token>` (enlace que en produccion vendria por email; en local ver `docs/project-management.md` y `AUTH_RESET_RETURN_TOKEN` en `server/.env.example`).

Tras un reset correcto se limpia el parametro `reset` de la URL y se vuelve al modo login.

## Otras paginas

- `FeedPage.tsx`: **encabezado** al inicio de la columna principal (**Inicio**, texto de contexto, usuario conectado); **Historias del gym** en tarjeta compacta centrada con pestañas Todos/Seguidos y fila de avatares en modo **`compact`**; rejilla **columna principal flexible** + panel derecho (resumen cuenta, sugerencias); timeline, **crear post**, likes, comentarios, seguir usuarios.
- `WorkoutsPage.tsx`: CRUD de entrenamientos; **etiquetas** (`tags`) y ejercicios como lineas en formulario; **buscar por titulo** (combinable con etiqueta) y **ordenar lista** (ultima sesion, mas sesiones, plantilla creada mas reciente, titulo A-Z); **filtrar por etiqueta** en la lista; **duplicar** rutina (**`Duplicar`**) crea una copia vía **`createWorkout`** (`"(copia)"` en titulo si cabe en 80 caracteres). **Sesiones:** card **Mis entrenamientos** primero; debajo, **`WorkoutSessionsPanel`** (formulario `#registrar-sesion` + historial con borrado, API **`/api/workout-sessions`**). Cada entreno: **Registrar sesion** (**`primary`**) preselecciona el entreno y hace scroll al formulario. Tarjetas con **conteo de sesiones** y **ultima fecha**.
- `ProfilePage.tsx`: ver/editar perfil deportivo; segunda card **Sesiones registradas** (misma API que Entrenamientos, solo lectura; gestionar en pestaña Entrenamientos).
