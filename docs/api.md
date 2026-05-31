# API REST (GoI)

Backend **Express** en **`server/`**. Prefijo **`/api`**. El cliente usa [`src/api/client.ts`](../src/api/client.ts): en desarrollo por defecto **`http://localhost:4000/api`**; en producción sin `VITE_API_URL`, rutas relativas **`/api`**.

Referencia ampliada de dominio y persistencia: [**docs/design.md**](./design.md) §4. Despliegue y mismo origen SPA + API: [**docs/deploy.md**](./deploy.md). Cliente HTTP del frontend (`apiFetch`, módulos): [**docs/api-client.md**](./api-client.md).

---

## Autenticación

En rutas protegidas por **`requireAuth`**:

```http
Authorization: Bearer <JWT>
```

Errores típicos: **`401`** con cuerpo `{ "code": "AUTH_HEADER_INVALID" | "AUTH_TOKEN_INVALID" | "AUTH_SESSION_STALE", "message": "..." }`.

---

## Formato de error

Salvo respuestas vacías o texto plano en casos puntuales, los errores JSON siguen:

```json
{
  "code": "CODIGO_DE_NEGOCIO",
  "message": "Texto legible en inglés o corto (según endpoint)"
}
```

Códigos HTTP usados: **200**, **201**, **400**, **401**, **403**, **404**, **429** (rate limit auth), **500**.

---

## Ejemplos por recurso

### `GET /api/health`

Sin JWT.

**Respuesta 200** (desarrollo, ejemplo):

```json
{
  "ok": true,
  "service": "social-sport-backend",
  "timestamp": "2026-05-07T12:00:00.000Z",
  "devStore": {
    "usersLoaded": 4,
    "storeFile": "C:\\...\\server\\data\\store.json"
  }
}
```

En producción/Vercel suele omitirse `devStore` (solo `ok`, `service`, `timestamp`).

---

### `POST /api/auth/register`

**Request:**

```json
{
  "username": "cris_dev",
  "email": "cris@test.com",
  "password": "123456"
}
```

**Respuesta 201** (cuerpo típico del controlador `authController.register`):

```json
{
  "message": "user registered",
  "user": {
    "id": "uuid-...",
    "username": "cris_dev",
    "email": "cris@test.com",
    "bio": "",
    "goal": "",
    "avatarUrl": ""
  },
  "token": "<JWT firmado con el id del usuario>"
}
```

El cliente debe guardar **`token`** y **`user`** juntos (`setAuth`) para que el `sub` del JWT coincida con el perfil cargado. **429** si rate limit (`code`: `AUTH_RATE_LIMITED`).

---

### `POST /api/auth/login`

**Request:**

```json
{
  "email": "cris@test.com",
  "password": "123456"
}
```

**Respuesta 200:**

```json
{
  "message": "...",
  "user": { "id": "...", "username": "...", "email": "...", "bio": "", "goal": "", "avatarUrl": "" },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### `PUT /api/auth/profile/:userId`

JWT obligatorio; solo el propio usuario (u otras reglas del controlador).

**Request (parcial):**

```json
{
  "username": "cris_dev",
  "bio": "Powerlifting",
  "goal": "Subir fuerza",
  "avatarUrl": "https://..."
}
```

**Respuesta 200:** `{ "message": "...", "user": { ... } }` — ver tipo `SafeUser` en tipos del front.

---

### `GET /api/workouts`

JWT obligatorio.

**Respuesta 200:** array de rutinas; cada elemento incluye entre otros `id`, `title`, `description`, `userId`, `exerciseIds`, `tags`.

```json
[
  {
    "id": "w1",
    "title": "Push",
    "description": "",
    "userId": "...",
    "exerciseIds": ["bench-press", "dip"],
    "tags": ["fuerza"]
  }
]
```

---

### `POST /api/workouts`

**Request:**

```json
{
  "title": "Nueva rutina",
  "description": "Notas",
  "exerciseIds": ["squat", "deadlift"],
  "tags": ["pierna"]
}
```

**Respuesta 201:** objeto rutina creada.

---

### `GET /api/exercises` y `GET /api/exercises/:id`

JWT obligatorio. **200** lista o un ejercicio; **404** + código tipo `EXERCISE_NOT_FOUND` si no existe el id.

---

### `GET /api/workout-sessions` / `POST /api/workout-sessions`

JWT obligatorio.

**POST** ejemplo:

```json
{
  "workoutId": "w1",
  "performedAt": "2026-05-07T18:30:00.000Z",
  "notes": "Buenas sensaciones"
}
```

**Respuesta 201:** objeto sesión. Errores **400** / **403** / **404** según negocio (`WORKOUT_*`, `WORKOUT_SESSION_*`).

---

### `GET /api/posts`

JWT obligatorio. **200:** lista de posts con interacciones (likes, comentarios, autor).

---

### `POST /api/posts`

**Request (simplificado):**

```json
{
  "content": "Hoy PR en sentadilla",
  "workoutId": "",
  "visibility": "public",
  "media": []
}
```

(Los campos exactos dependen del validador del controlador; el front envía también URLs/base64 de media según implementación.)

**201:** post creado. **401** `AUTH_SESSION_STALE` si el usuario del JWT no existe en disco.

---

### `PUT /api/posts/:id`

Actualización de texto/visibilidad del post del usuario.

**Request (ejemplo):**

```json
{
  "content": "Texto editado",
  "visibility": "followers"
}
```

**200:** post actualizado.

---

### `DELETE /api/posts/:id`

**200:** `{ "message": "...", "post": { ... } }` (forma típica).

---

### `GET /api/posts/:id/likes`

JWT obligatorio. Lista usuarios que dieron me gusta al post (más recientes primero). Usuarios bloqueados respecto al viewer se omiten.

**200:**

```json
{
  "likes": [
    {
      "id": "<userId>",
      "username": "atleta",
      "avatarUrl": "https://…",
      "likedAt": "2026-05-26T12:00:00.000Z"
    }
  ],
  "total": 1
}
```

**401** sin token · **403** si no puedes ver el post · **404** post inexistente.

---

### `POST /api/posts/:id/likes`

**Request:** `{ "userId": "<uuid>" }` — **200:** `{ "liked": true }` (toggle).

---

### `POST /api/posts/:id/comments`

**Request:**

```json
{
  "userId": "<uuid>",
  "content": "¡Gran trabajo!"
}
```

**201:** comentario creado.

---

### `GET /api/posts/notifications` · `POST /api/posts/notifications/read`

JWT; listado de notificaciones y marcar leídas — ver controlador [`postsController.ts`](../server/src/controllers/postsController.ts).

---

### `GET /api/stories` / `POST /api/stories`

JWT obligatorio. **POST** con slides en base64/Data URL según validación del servidor — ver [**docs/design.md**](./design.md) § Historias.

---

### `GET /api/personal-roadmap` / `PUT /api/personal-roadmap`

**Sin JWT.** Fichero JSON aparte del `store`.

**GET 200:**

```json
{
  "tasks": [
    {
      "id": "root",
      "title": "Proyecto",
      "done": false,
      "children": []
    }
  ]
}
```

**PUT** mismo esquema en body; **200** tras persistir.

---

## Mapa rápido de archivos

| Capa | Ubicación |
|------|-----------|
| Montaje de rutas | [`server/src/app.ts`](../server/src/app.ts) |
| Rutas | [`server/src/routes/*.ts`](../server/src/routes/) |
| Controladores | [`server/src/controllers/*.ts`](../server/src/controllers/) |
| Servicios / persistencia | [`server/src/services/`](../server/src/services/) |
| Auth middleware | [`server/src/middleware/requireAuth.ts`](../server/src/middleware/requireAuth.ts) |
| Errores JSON | [`sendError` en `server/src/services/http.ts`](../server/src/services/http.ts) |

---

## Tests

Suites en **`server/src/__tests__/`** (`vitest`): ejercicios, posts seguridad, auth/workouts, sesiones, historias, etc. Comando: `npm run test` dentro de **`server/`**.
