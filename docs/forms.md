# Formularios e interacción (GoI)

En el front usamos **formularios controlados**: el valor de cada campo viene del **estado de React** (`useState` en la página o props desde el padre) y cada cambio pasa por **`onChange`** (o handlers equivalentes). Así la UI y los datos van sincronizados y podemos validar antes de enviar.

## Patrones que repetimos

| Patrón | Dónde |
|--------|--------|
| Estado por campo o grupo de campos | [`AuthPage.tsx`](../src/pages/AuthPage.tsx) (`username`, `email`, `password`), [`FeedPage.tsx`](../src/pages/FeedPage.tsx) + [`CreatePostForm.tsx`](../src/components/feed/CreatePostForm.tsx) (`content`, imágenes, visibilidad). |
| Validación en cliente antes del API | Registro/login (longitud mínima usuario/contraseña), compositor de publicaciones (caracteres / fotos), límites `maxLength` en perfil. |
| Feedback al usuario | [`StatusMessage`](../src/components/ui/StatusMessage.tsx) para error / éxito / carga; muchas páginas guardan `error` y `message` en estado. |
| Errores de red o API | [`getErrorMessage`](../src/utils/errorMessages.ts) para mensajes legibles a partir de respuestas del backend. |

---

## Ejemplo 1 — inputs controlados y límites (`ProfileForm`)

El valor sale de props; el padre posee el estado. HTML `required`, `maxLength` y contador de caracteres.

```43:49:src/components/profile/ProfileForm.tsx
        <input
          className="goi-field"
          required
          value={username}
          maxLength={24}
          onChange={(event) => onChangeUsername(event.target.value)}
        />
```

---

## Ejemplo 2 — validación en envío (`AuthPage`)

Antes de llamar al API se comprueban reglas básicas; si fallan se lanza error y se muestra con `StatusMessage`.

```75:80:src/pages/AuthPage.tsx
      if (view === "register" && username.trim().length < 3) {
        throw new Error("El usuario debe tener al menos 3 caracteres");
      }
      if (password.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres");
      }
```

Tras las comprobaciones locales, en **registro** la respuesta de **`POST /api/auth/register`** incluye **`token`** y **`user`**: el cliente llama a **`setAuth(reg.token, reg.user)`**. Si la respuesta no trajera ambos campos, se haría **`login`** y se usaría el usuario devuelto por login con su JWT (evita desajuste entre `sub` del token y el objeto usuario). Detalle en **`docs/api.md`** y **`docs/project-management.md`** (§118).

---

## Ejemplo 3 — validación derivada del borrador (publicación)

El compositor no envía si no cumple reglas de negocio; `useMemo` calcula si se puede publicar y el texto de ayuda.

```247:260:src/pages/FeedPage.tsx
  const composerValidation = useMemo(() => {
    const trimmed = content.trim();
    const hasMedia = draftImages.length > 0;
    if (!hasMedia && trimmed.length < 4) {
      return {
        canSubmit: false,
        hint: `Escribe al menos ${Math.max(0, 4 - trimmed.length)} caracteres o adjunta una foto.`,
      };
    }
    if (trimmed.length > 280) {
      return { canSubmit: false, hint: `Te pasaste por ${trimmed.length - 280} caracteres.` };
    }
    return { canSubmit: true, hint: "" };
  }, [content, draftImages.length]);
```

[`CreatePostForm`](../src/components/feed/CreatePostForm.tsx) recibe `canSubmit`, `submitHint` y desactiva el botón de publicar cuando corresponde.

---

## Componente de mensajes (`StatusMessage`)

Unifica mensajes de **error**, **éxito** y opcionalmente **carga**, con tonos para fondo claro u oscuro.

```10:28:src/components/ui/StatusMessage.tsx
export function StatusMessage({
  loading = false,
  error = "",
  success = "",
  loadingText = "Cargando...",
  tone = "light",
}: StatusMessageProps) {
  // …
  return (
    <>
      {loading && <p className={`m-0 ${loadingClass}`}>{loadingText}</p>}
      {error && <p className={`m-0 ${errorClass}`}>{error}</p>}
      {success && <p className={`m-0 ${successClass}`}>{success}</p>}
    </>
  );
}
```

---

## Otros formularios destacados

| Área | Archivo |
|------|---------|
| Rutinas | [`WorkoutForm.tsx`](../src/components/workouts/WorkoutForm.tsx) |
| Historias | [`CreateStoryModal.tsx`](../src/components/feed/CreateStoryModal.tsx) |
| Comentarios / menciones | [`MentionComposer.tsx`](../src/components/feed/MentionComposer.tsx), [`MentionableTextarea.tsx`](../src/components/feed/MentionableTextarea.tsx) |

Detalle de props en **[docs/components.md](./components.md)** donde aplique.

---

## Checklist (documentación académica)

| Requisito | En GoI |
|-----------|--------|
| Formularios controlados | `value` + `onChange` / estado elevado (perfil, auth, compositor, etc.). |
| Estado de inputs | `useState` en página o estado en `FeedPage` pasado a `CreatePostForm`. |
| Validación básica | Reglas en submit (auth), `maxLength`/`required`, `composerValidation`. |
| Mensajes error / confirmación | `StatusMessage`, `error`/`message`, hints del compositor. |
| Documentación | Este archivo (`docs/forms.md`). |

---

## Referencias

- Componentes UI reutilizables: [`docs/components.md`](./components.md).
- Mensajes de error API: [`docs/design.md`](./design.md) (sección coherente con `errorMessages` si está descrita allí).
