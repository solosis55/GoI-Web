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
  - Props: `src`, `alt`, `size`, `className`, opcional **`fill`** (rellena el contenedor padre con **`h-full w-full`** y **`object-cover`**, sin anillo ni tamaño fijo — p. ej. **`SidebarSessionBadge`**).
  - Uso: imagen de usuario en historias y sugerencias; estilo base **`rounded-full`**, **`object-cover`**, anillo **`neutral-800`** (salvo cuando **`fill`**).
- `EmptyState`
  - Props: `message`, `className`.
  - Uso: estados vacios en listas y paneles; texto base **`text-neutral-500`** (ampliable con `className`).

### Marca (`src/components/branding`)
- `GoISidebarBadge`
  - Props: `subtitle`, `description?`, opcional **`showDescriptionOnMobile`**.
  - Uso: pantalla **auth** centrada sobre el card (logo circular, FitSocial).
- `SidebarSessionBadge`
  - Props: `username`, `avatarUrl`.
  - Uso: **lateral con sesión** — foto en anillo dorado equivalente al logo GoI; FitSocial y `@usuario`.

### Layout (`src/components/layout`)
- `SidebarNavigation`
  - Props: **`activeTab`** (`"feed" | "profile" | "workouts"`); **`onFeed`**, **`onWorkouts`**, **`onProfile`**, **`onLogout`** (callbacks).
  - Uso: barra lateral autenticada en **`App.tsx`** debajo de **`SidebarSessionBadge`**. Cuatro **`Button`** con iconos **`aria-hidden`** (casa / mancuerna / usuario / salida): **`secondary`** o **`navActive`** según pestaña; **`danger`** para **Cerrar sesión**. Clases **`motion-safe:`** en hover/active e iconos; rejilla **`max-md:grid-cols-2`** con logout **`max-md:col-span-2`**.
- `SiteFooter`
  - Props: ninguna (copy fijo + año con `new Date().getFullYear()`).
  - Uso: pie global bajo el `main` en **`App.tsx`** (sesion invitada y autenticada). Enlace externo **Roadmap** (Trello); textos Aviso legal / Privacidad / Contacto como placeholders (`title` “Página en preparación”) hasta tener rutas o URLs.

### Feed (`src/components/feed`)
- `PostItem`
  - Props: `post`, `isOwner`, `currentUserId`, **`mentionCandidates`**, **`mentionDirectory`**, **`onOpenUserProfile?`**, callbacks de like/delete/comment/update.
  - Uso: tarjeta principal; autor (avatar+nombre) y menciones `@` enlazan al perfil modal.
- `CommentList`
  - Props: `comments`, `currentUserId`, **`mentionDirectory`**, **`onOpenUserProfile?`** (clic avatar/nombre y enlaces `@usuario` conocidos → perfil público).
  - Uso: lista de comentarios; **`Avatar`** 32 px; texto con menciones destacadas/abrir perfil cuando el usuario existe en el mapa.
- `PostActions`
  - Props: `isOwner`, `onLike`, `onDelete`.
  - Uso: acciones de like y eliminar.
- `FollowSuggestionItem`
  - Props: `user`, `isFollowing`, `onToggleFollow`.
  - Uso: item de sugerencias para seguir usuarios.
- `StoriesRow`
  - Props: `authors` (lista `FeedStoryAuthor` desde `GET /api/stories`), `currentUserId`, `seenRevision` (fuerza releer `storySeen` en `localStorage`), `onSelectAuthor`.
  - Uso: fila horizontal de **reels** (tu usuario + seguidos); anillo dorado cuando hay slides **no vistas**; gradientes laterales sobre scroll.
- `CreateStoryModal`
  - Props: `open`, `onClose`, `onCreated` (tras `POST /api/stories` correcto).
  - Uso: elegir/compimir imagenes cliente (`postImages`), previsualizar, publicar historia (limite servidor 1–15 slides).
- `StoryViewerModal`
  - Props: `open`, `authors`, `startAuthorIdx`, `startSlideIdx`, `onClose`, `onStoriesUiRefresh` (p. ej. incrementar revision de vistas).
  - Uso: visor pantalla oscura con avance temporal; marca visto via `storySeen` al terminar autor.
- `PostMediaGallery`
  - Props: `media` (`PostMediaItem[]`).
  - Uso: rejilla responsive de imagenes (enlace abre nueva pestaña) dentro del post.
- `FeedNotificationsBell`
  - Props: `notifications`, `unreadCount`, `loading`, `onRefresh`.
  - Uso: campana con panel de avisos del feed; marca leidas con API (`postsApi`).
- `UserPublicProfileModal`
  - Props: `userId | null`, `currentUserId`, `initialFollowingIds`, `onClose`, `onFollowingChanged?`.
  - Uso: perfil ligero ajeno (`getProfile` + posts de usuario + follow).
- `CreatePostForm`
  - Props: `content`, `selectedWorkoutId`, **`mentionCandidates`** (lista para autocompletar **@** en el texto), `workouts`, handlers.
  - Uso: formulario para crear publicacion.
- `MentionComposer` / `MentionableTextarea`
  - Comentarios y texto del post: sugerencias al escribir **@**, teclado arriba/abajo/Enter/Tab.
- `PostComposer`
  - Componente simple input+boton; el feed usa **`MentionComposer`** en su lugar.
- `FeedModeTabs`
  - Props: `mode`, `onChangeMode`, `compact?` (pills `text-xs` y menos padding; pestañas centradas con `justify-center`).
  - Uso: alternar feed entre "Todos" y "Seguidos" (en historias se usa **`compact`**).
- `UserSummaryCard`
  - Props: `username`, `myPostsCount`.
  - Uso: resumen de cuenta en sidebar del feed.

### Workouts (`src/components/workouts`)
- `WorkoutForm`
  - Props: `title`, `description`, **`exerciseIds: string[]`**, **`exerciseCatalog: Exercise[]`**, `exerciseCatalogError?`, `exerciseCatalogLoading?`, handlers de titulo/descripcion/**`onChangeExerciseIds`**/etiquetas, `onSubmit`, `submitLabel`, `onCancel`, **`onOpenCatalog?`** (si esta definido, añadir ejercicios delega en navegar al catalogo en lugar del buscador embebido).
  - Uso: crear y editar **rutinas**; etiquetas como lineas (**Añadir** / **Quitar**); ejercicios mediante **`ExercisePicker`** (orden subir/bajar/quitar; IDs del catalogo).
- `ExercisePicker`
  - Props: `exerciseIds`, `catalog`, `onChange`, **`onOpenCatalog?`**, `catalogError`, `catalogLoading`, `disabled`.
  - Uso: si **`onOpenCatalog`** existe, muestra CTA **Elegir ejercicios en el catalogo** y la lista ordenada de la rutina; si no, modo legacy con busqueda embebida en mini lista (max ~40 resultados).
- `WorkoutItem`
  - Props: `workout`, **`exerciseLabels`** (nombres resueltos desde el catalogo en `WorkoutsPage`), **`sessionCount`**, **`lastSessionPerformedAt`**, estado de edicion, callbacks de edicion/borrado/duplicar segun implementacion actual.
  - Uso: item de lista con titulo, descripcion, chips de etiquetas, resumen de sesiones, **lista de nombres de ejercicios**; acciones **Duplicar**, **Editar**, **Eliminar** (mas detalle en `WorkoutItem.tsx`).
- `WorkoutSessionCalendar`
  - Props: `sessions`.
  - Uso: mini calendario mensual (lun-dom) con dias de entrenamiento resaltados; navegacion de mes y boton Hoy. Se usa en cabecera de `WorkoutsPage`.
- `WorkoutSessionsHistory`
  - Props: `sessions`, `loading`, `title`, `description` (opcional), `emptyMessage`, `showDelete`, `onDeleteSession`.
  - Uso: lista de entrenamientos registrados; actualmente visible en **Perfil** (solo lectura). Puede reutilizarse en otras pantallas.
- `WorkoutSessionsPanel`
  - Props: `workouts`, `sessions` (con `workoutTitle`), `loading`, estado del formulario de sesion (`sessionWorkoutId`, `sessionPerformedAt`, `sessionNotes` + `onChange*`), `onSubmitSession`, `onDeleteSession`.
  - Uso: bloque de registro + historial (reutilizable). En el estado actual **no** se renderiza en `WorkoutsPage` para no saturar el flujo.

### Profile (`src/components/profile`)
- `ProfileForm`
  - Props: campos de perfil, estados (`loading/error/message`) y handlers.
  - Uso: formulario de actualizacion de perfil.

## Pendientes

- [ ] (Opcional) Extraer `FeedSidebar` para encapsular toda la barra derecha del feed.
