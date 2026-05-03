# Componentes (MVP)

## Checklist de la fase

- [x] Crear varios componentes reutilizables usando React.
- [x] Definir props tipadas usando TypeScript.
- [x] Usar composicion de componentes cuando sea necesario.
- [x] Aplicar Tailwind CSS para estilos y layout.
- [x] Crear componentes (listas, tarjetas, formularios) que consuman datos tipados.
- [x] Documentar componentes en este archivo.

## Componentes implementados

### UI base (`src/components/ui`)
- `Button`
  - Props: `variant` (`primary` | `secondary` | `danger` | `navActive` | `link` | `linkDark`), props nativas de `button`.
  - Uso: **`primary`** y **`navActive`** comparten linea **oro GoI** (CTA y pestaña activa); **`secondary`** pildora clara (`neutral-100`) para contraste sobre lateral o cards oscuras; **`danger`** eliminar/cerrar sesion; **`link`** / **`linkDark`** enlaces tipo boton en tonos **oro** / **acero** sobre fondo oscuro. Incluye **`focus-visible`** con anillo oro y `ring-offset-black` para teclado.
- `Card`
  - Props: `tone`, `as`, `className`, `id` (opcional, p. ej. ancla para scroll).
  - Uso: contenedores en feed, perfil, entrenamientos y **auth**; `tone="dark"` y el tono por defecto son **paneles oscuros** (zinc/negro) con viñeta interior dorada sutil — elegir según jerarquía visual en la pantalla.
- `StatusMessage`
  - Props: `loading`, `error`, `success`, `loadingText`, `tone` (`light` | `dark`, por defecto `light`).
  - Uso: feedback de carga/error/exito; **`tone="dark"`** en feed, workouts, perfil y auth donde el fondo es oscuro (clases de texto alineadas a neutrales).
- `Avatar`
  - Props: `src`, `alt`, `size`, `className`.
  - Uso: imagen de usuario en historias y sugerencias; estilo base **`rounded-full`**, **`object-cover`**, anillo **`neutral-800`**.
- `EmptyState`
  - Props: `message`, `className`.
  - Uso: estados vacios en listas y paneles; texto base **`text-neutral-500`** (ampliable con `className`).

### Marca (`src/components/branding`)
- `GoISidebarBadge`
  - Props: `subtitle` (ReactNode), `description` (opcional).
  - Uso: logo GoI (circular), rótulo FitSocial, subtítulo (`@usuario` o copy de login); grid **centrada** en el ancho del aside.

### Layout (`src/components/layout`)
- `SiteFooter`
  - Props: ninguna (copy fijo + año con `new Date().getFullYear()`).
  - Uso: pie global bajo el `main` en **`App.tsx`** (sesion invitada y autenticada). Enlace externo **Roadmap** (Trello); textos Aviso legal / Privacidad / Contacto como placeholders (`title` “Página en preparación”) hasta tener rutas o URLs.

### Feed (`src/components/feed`)
- `PostItem`
  - Props: `post`, `isOwner`, `currentUserId`, callbacks de like/delete/comment.
  - Uso: tarjeta principal de publicacion.
- `CommentList`
  - Props: `comments`, `currentUserId`.
  - Uso: lista tipada de comentarios por post.
- `PostComposer`
  - Props: `value`, `onChange`, `onSubmit`.
  - Uso: input + boton para comentar.
- `PostActions`
  - Props: `isOwner`, `onLike`, `onDelete`.
  - Uso: acciones de like y eliminar.
- `FollowSuggestionItem`
  - Props: `user`, `isFollowing`, `onToggleFollow`.
  - Uso: item de sugerencias para seguir usuarios.
- `StoriesRow`
  - Props: `posts`, `compact?` (opcional: avatares y celdas mas pequeños, espaciado ajustado para la tarjeta compacta de historias).
  - Uso: fila de historias basada en publicaciones recientes; contenedor centrado con scroll horizontal si hay muchas.
- `CreatePostForm`
  - Props: `content`, `selectedWorkoutId`, `workouts`, handlers.
  - Uso: formulario para crear publicacion.
- `FeedModeTabs`
  - Props: `mode`, `onChangeMode`, `compact?` (pills `text-xs` y menos padding; pestañas centradas con `justify-center`).
  - Uso: alternar feed entre "Todos" y "Seguidos" (en historias se usa **`compact`**).
- `UserSummaryCard`
  - Props: `username`, `myPostsCount`.
  - Uso: resumen de cuenta en sidebar del feed.

### Workouts (`src/components/workouts`)
- `WorkoutForm`
  - Props: `title`, `description`, **`exercises: string[]`**, **`tags: string[]`**, cambios campo a campo (`onChangeExercises`, `onChangeTags`), `onSubmit`, `submitLabel`, `onCancel`.
  - Uso: crear y editar entrenamientos; **etiquetas** y **ejercicios** como lineas editables (**Añadir** / **Quitar**); etiquetas opcionales (max 20 caracteres por linea en UI; el servidor recorta y deduplica).
- `WorkoutItem`
  - Props: `workout`, **`sessionCount`**, **`lastSessionPerformedAt`** (ISO o `null`, derivados en `WorkoutsPage` desde `sessions`), estado de edicion, handlers de edicion (**`editExercises`**, **`editTags`**), `onSubmitEdit`, `onStartEdit`, `onCancelEdit`, `onDelete`, **`onDuplicate`**, **`onLogSession`** (preselecciona el entreno, refresca fecha/hora por defecto y hace scroll a **`#registrar-sesion`** debajo de la lista).
  - Uso: item de lista con vista (titulo, descripcion, **chips de etiquetas**, **resumen de sesiones**, **lista ordenada de ejercicios**) o formulario embutido; **Registrar sesion** como **`Button` `primary`** (CTA visible); **Duplicar**, **Editar**, **Eliminar**.
- `WorkoutSessionsHistory`
  - Props: `sessions`, `loading`, `title`, `description` (opcional), `emptyMessage`, `showDelete`, `onDeleteSession`.
  - Uso: lista de sesiones (misma forma en **Perfil** sin borrar y en **Entrenamientos** con `showDelete` + `onDeleteSession`).
- `WorkoutSessionsPanel`
  - Props: `workouts`, `sessions` (con `workoutTitle`), `loading`, estado del formulario de sesion (`sessionWorkoutId`, `sessionPerformedAt`, `sessionNotes` + `onChange*`), `onSubmitSession`, `onDeleteSession`.
  - Uso: bloque **Registrar sesion** (`#registrar-sesion`) + **`WorkoutSessionsHistory`** con borrado en **`WorkoutsPage`**; en layout de pagina va **debajo** de la lista **Mis entrenamientos** para alinear el scroll del atajo desde cada **`WorkoutItem`**.

### Profile (`src/components/profile`)
- `ProfileForm`
  - Props: campos de perfil, estados (`loading/error/message`) y handlers.
  - Uso: formulario de actualizacion de perfil.

## Pendientes

- [ ] (Opcional) Extraer `FeedSidebar` para encapsular toda la barra derecha del feed.
