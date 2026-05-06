/**
 * Cuentas locales documentadas en README (desarrollo / demos).
 * Contraseña común **123456**; no usar en producción.
 *
 * Recrearlas en `server/data/store.json`: desde la raíz del repo `npm run seed:demo-users`
 * (solo añade emails que no existan). Contraseña mínimo 6 caracteres (validación del seed y del API).
 *
 * Vitest ya no llama `saveStore()` contra disco; si tu `store.json` quedó corrupto tras tests antiguos,
 * puedes borrar el array `users` y ejecutar el seed para volver a las cuatro cuentas.
 */
export type DemoUserRow = {
  username: string;
  email: string;
  password: string;
  goal: string;
  bio: string;
  avatarUrl: string;
};

export const DEMO_USERS: readonly DemoUserRow[] = [
  {
    username: "alice",
    email: "alice@test.com",
    password: "123456",
    goal: "Fuerza máxima",
    bio: "Priorizo básicos pesados—banca, sentadilla, peso muerto.",
    avatarUrl: "",
  },
  {
    username: "bob",
    email: "bob@test.com",
    password: "123456",
    goal: "Resistencia y técnica",
    bio: "Mezclo cardio liviano con sesiones largas en gimnasio.",
    avatarUrl: "",
  },
  {
    username: "cristian",
    email: "cristian@test.com",
    password: "123456",
    goal: "Recomposición",
    bio: "Subiendo volumen gradual; feed para motivación.",
    avatarUrl: "",
  },
  {
    username: "dana",
    email: "dana@test.com",
    password: "123456",
    goal: "Empezar con buenos hábitos",
    bio: "Tres entrenos por semana; aprendiendo progresiones.",
    avatarUrl: "",
  },
];
