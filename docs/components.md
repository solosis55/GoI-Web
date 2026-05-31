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
  - Uso: **`primary`** y **`navActive`** comparten linea **oro GoI** (CTA y pestaña activa); **`secondary`** pildora clara (`neutral-100`) para contraste sobre lateral o cards oscuras; **`danger`** eliminar/cerrar sesion; **`link`** / **`linkDark`** enlaces tipo boton en tonos **oro** / **acero** sobre fondo oscuro. Incluye **`focus-visible`** con anillo oro y `ring-offset-black` para teclado y altura mínima táctil (**`min-h-11`**, ~44 px).
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
  - Props: `subtitle`, `description?`, opcional **`showDescriptionOnMobile`**, **`presentation`** (`"compact"` | **`hero`**`; defecto **`compact`**), **`heroHalo`** (solo con **`hero`**: halo **conic-gradient** rotatorio detrás del círculo; clase **`goi-hero-halo`** en **`index.css`**, nodos **188×188** px y **236×236** px en `sm`), **`heroHaloRef`**.
  - Uso: pantalla **auth** / splash (`LoginHeroBrand`) y sidebar compacto. La imagen del logo viene de **`brandingLogoSrc(theme)`** (`src/utils/brandingLogo.ts`: Legacy = mark PNG, otros temas = lockups en `public/branding/`). En **`hero` + halo**: imagen **`absolute inset-0`**, **`object-cover`**, **`scale`** ~1.22 / 1.14 (`sm`), **`light:mix-blend-multiply`** en temas claros. En **`compact`**: **`object-contain`** en ~72% del anillo, sin halo.
- `LoginHeroBrand`
  - Props: mismos textos que **`GoISidebarBadge`** (`subtitle`, `description?`, **`showDescriptionOnMobile`**), **`onDismissComplete`** al terminar la salida del logo (~1 s).
  - Uso: solo **`App.tsx`** invitado — primero **solo** marca centrada (`splash`); al clic desaparece con transición larga y el padre muestra **`AuthPage`** con **`auth-form-reveal`**.
- `SidebarSessionBadge`
  - Props: `username`, `avatarUrl`.
  - Uso: **lateral con sesión** — foto en anillo dorado equivalente al logo GoI; GoI y `@usuario`.

### Layout (`src/components/layout`)
- `SidebarNavigation`
  - Props: **`activeTab`** (`"feed" | "profile" | "workouts"`); **`onFeed`**, **`onWorkouts`**, **`onProfile`**, **`onLogout`** (callbacks).
  - Uso: barra lateral autenticada en **`App.tsx`** debajo de **`SidebarSessionBadge`**. Cuatro **`Button`** con iconos **`aria-hidden`** (casa / mancuerna / usuario / salida): **`secondary`** o **`navActive`** según pestaña; **`danger`** para **Cerrar sesión**. Clases **`motion-safe:`** en hover/active e iconos; rejilla **`max-md:grid-cols-2`** y en móviles muy estrechos (**`max-[430px]`**) pasa a **una columna** para evitar botones comprimidos.
- `SiteFooter`
  - Props: ninguna (copy fijo + año con `new Date().getFullYear()`).
  - Uso: pie global bajo el `main` en **`App.tsx`** y en **`LegalPageShell`**. **`Link`** a **`/roadmap`** con texto **Roadmap** (diagrama personal de planificación); **`Link`** a **`/aviso-legal`**, **`/privacidad`**, **`/contacto`**. En móvil centra copy/enlaces y oculta separadores `·` para mejorar legibilidad cuando hace wrap. El tablero público Trello del proyecto se enlaza desde el copy de **`/roadmap`** y del **`README.md`**, no desde este pie. Alternador de tema (`ThemeToggle`).
- `PageContainer`
  - Props: `children`, `className?`.
  - Uso: ancho máximo reutilizable para el contenido principal autenticado (`max-w-6xl`) con padding lateral consistente; separa feed/rutinas/perfil de los bordes externos de la ventana. En móvil usa padding aún más compacto (`px-0.5`) para aprovechar ancho sin pegar el contenido al borde.

### Roadmap (`src/components/roadmap`)
- `RoadmapDiagram`
  - Props: `tasks` (`RoadmapTask[]`), `handlers` (toggle, título, eliminar, añadir hijo).
  - Uso: vista **`PersonalRoadmapPage`** — zoom/pan (Ctrl+rueda, arrastre del fondo), nodos editables, conectores SVG actualizados sin estado React en los paths (reduce parpadeos). Contexto de registro para medir aristas (`collectRoadmapEdges` en `src/utils/roadmapEdges.ts`).

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
  - Uso: fila horizontal de **reels** (tu usuario + seguidos); anillo dorado cuando hay slides **no vistas**; gradientes laterales sobre scroll. En móviles muy estrechos reduce ligeramente el tamaño de avatar para mantener más ítems visibles sin saturar.
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
  - Uso: campana con panel de avisos del feed; marca leidas con API (`postsApi`). Ajustada para móvil: objetivo táctil de ~44 px y panel más ancho relativo al viewport (`100vw - 1rem`).
- `UserPublicProfileModal`
  - Props: `userId | null`, `currentUserId`, `initialFollowingIds`, `onClose`, `onFollowingChanged?`.
  - Uso: perfil ligero ajeno (`getProfile` + posts de usuario + follow).
- `CreatePostForm`
  - Props: `content`, `selectedWorkoutId`, **`mentionCandidates`** (lista para autocompletar **@** en el texto), `workouts`, handlers.
  - Uso: formulario para crear publicacion (ahora se monta dentro de modal en `FeedPage`, no inline en card) en formato **wizard de 3 fases**: (1) Imagen + edición, (2) Texto/menciones + configuración, (3) Revisión. Incluye stepper, navegación `Atrás / Siguiente / Publicar`, validación por pasos, y mantiene validación en vivo, preview, estado de transferencia, adjuntos (reordenar/portada/recorte), menciones priorizadas y plantillas rápidas. Tras añadir imágenes, muestra una vista principal grande de portada durante todo el flujo. El textarea principal usa `resize-none` + `autoGrow`.
- `postCreateDraft` (`src/utils/postCreateDraft.ts`)
  - API: `readPostCreateDraft`, `writePostCreateDraft`, `clearPostCreateDraft`.
  - Uso: borrador de creación de post por usuario en `sessionStorage` (`goi:postCreateDraft:v1`); soporte para confirmar cierre del modal con cambios y descarte explícito.
- `MentionComposer` / `MentionableTextarea`
  - Comentarios y texto del post: sugerencias al escribir **@**, teclado arriba/abajo/Enter/Tab. Prioriza seguidos y recientes; al elegir una mención se actualiza histórico reciente por usuario (persistencia local). `MentionableTextarea` soporta `autoGrow` para crecer con contenido (sin resize manual). En pantallas muy estrechas el botón **Comentar** baja debajo del campo para evitar overflow horizontal.
- Tests asociados (frontend): `src/utils/mentionAutocomplete.test.ts` valida orden de sugerencias y filtro de query; `src/utils/postComposerTemplates.test.ts` valida inserción/append de plantillas.
- `PostComposer`
  - Componente simple input+boton; el feed usa **`MentionComposer`** en su lugar.
- `FeedModeTabs`
  - Props: `mode`, `onChangeMode`, `compact?` (pills `text-xs` y menos padding; pestañas centradas con `justify-center`).
  - Uso: alternar feed entre "Todos" y "Seguidos" (en historias se usa **`compact`**); segmentos con altura mínima táctil (~44 px).
- `UserSummaryCard`
  - Props: `username`, `myPostsCount`, opcional **`onGoToProfile`** (callback al pulsar **Ir al perfil**; con sesión propia **`App`** pasa navegación a pestaña Perfil en lugar de modal vacío).
  - Uso: resumen de cuenta en sidebar del feed.
- `FeedSidebar`
  - Props: `username`, `myPostsCount`, `suggestedUsers`, `followingIds`, `onToggleFollow`, `onViewProfile`, opcional **`onGoToProfile`**, `className?`.
  - Uso: lateral reutilizable del feed (resumen de cuenta + sugerencias + acciones de seguir/perfil). En móvil se renderiza en la columna principal; en desktop se mantiene en el lateral derecho. **`onGoToProfile`** se reenvía a **`UserSummaryCard`**.

### Estadísticas (`src/components/stats`)
- `MuscleBodyGlowMapBasic`
  - Props: `hits` (conteos por eje del octágono muscular), `mapPeriod`, `className?`, entre otras según implementación.
  - Uso: **`StatisticsPersonalTab`** — mapa corporal frente/espalda con intensidad por zona; IDs de paths SVG enlazados a ejes vía **`src/utils/muscleBodyMapSvgZones.ts`** (`MUSCLE_MAP_AXIS_TO_SVG_IDS`, `MUSCLE_MAP_PATH_FALLBACK_LABEL`).
- `MuscleBodyGlowMap`
  - Props: `hits`, `className?`.
  - Uso: variante de mapa muscular con siluetas SVG detalladas (misma familia de datos que el octágono).

### Workouts (`src/components/workouts`)
- `WorkoutForm`
  - Props: `title`, `description`, **`exerciseIds: string[]`**, **`exerciseCatalog: Exercise[]`**, `exerciseCatalogError?`, `exerciseCatalogLoading?`, handlers de titulo/descripcion/**`onChangeExerciseIds`**/etiquetas, `onSubmit`, `submitLabel`, `onCancel`, **`onOpenCatalog?`** (si esta definido, añadir ejercicios delega en navegar al catalogo en lugar del buscador embebido).
  - Uso: crear y editar **rutinas**; etiquetas como lineas (**Añadir** / **Quitar**); ejercicios mediante **`ExercisePicker`** (orden subir/bajar/quitar; IDs del catalogo).
- `ExercisePicker`
  - Props: `exerciseIds`, `catalog`, `onChange`, **`onOpenCatalog?`**, `catalogError`, `catalogLoading`, `disabled`.
  - Uso: si **`onOpenCatalog`** existe, muestra CTA **Elegir ejercicios en el catalogo** y la lista ordenada de la rutina; si no, modo legacy con busqueda embebida en mini lista (max ~40 resultados).
- `WorkoutItem`
  - Props: `workout`, **`exerciseLabels`** (nombres resueltos desde el catalogo en `WorkoutsPage`), **`sessionCount`**, **`lastSessionPerformedAt`**, estado de edicion, callbacks de edicion/borrado/duplicar segun implementacion actual.
  - Uso: item de lista con titulo, descripcion, chips de etiquetas, resumen de sesiones, **lista de nombres de ejercicios**; acciones **Duplicar**, **Editar**, **Eliminar** (mas detalle en `WorkoutItem.tsx`). En pantallas muy estrechas (<480 px) la botonera se apila en columna para evitar recortes de texto.
- `WorkoutSessionCalendar`
  - Props: `sessions`.
  - Uso: mini calendario mensual (lun-dom) con dias de entrenamiento resaltados; navegacion de mes y boton Hoy. Se usa en cabecera de `WorkoutsPage`; en móviles muy estrechos centra y apila mejor la cabecera del mes.
- `WorkoutSessionsHistory`
  - Props: `sessions`, `loading`, `title`, `description` (opcional), `emptyMessage`, `showDelete`, `onDeleteSession`.
  - Uso: lista de entrenamientos registrados; actualmente visible en **Perfil** (solo lectura). Puede reutilizarse en otras pantallas.
- `WorkoutSessionsPanel`
  - Props: `workouts`, `sessions` (con `workoutTitle`), `loading`, estado del formulario de sesion (`sessionWorkoutId`, `sessionPerformedAt`, `sessionNotes` + `onChange*`), `onSubmitSession`, `onDeleteSession`.
  - Uso: bloque de registro + historial (reutilizable). En el estado actual **no** se renderiza en `WorkoutsPage` para no saturar el flujo.

### Profile (`src/components/profile`)
- `ProfileForm`
  - Props: campos de perfil, estados (`loading/error/message`) y handlers.
  - Uso: formulario de actualizacion de perfil. CTA de guardado a ancho completo en móvil para mejorar tap target.

## Pendientes

- [ ] (Opcional) seguir extrayendo bloques de `FeedPage` si crece la complejidad del timeline principal (el sidebar ya está en **`FeedSidebar`**).
