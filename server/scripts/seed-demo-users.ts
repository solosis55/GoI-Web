/**
 * Añade al store las cuentas de DEMO_USERS si el email aún no existe.
 * Uso: desde `server/`, `npm run seed:demo-users`
 */
import { DEMO_USERS } from "../src/data/demoUsers.js";
import { hashPassword } from "../src/services/auth.js";
import { createId, initializeStore, saveStore, store, type User } from "../src/services/store.js";
import { isLengthBetween, normalizeEmail, sanitizeText } from "../src/services/validation.js";

async function main() {
  initializeStore();
  const now = new Date().toISOString();
  let added = 0;

  for (const row of DEMO_USERS) {
    const email = normalizeEmail(row.email);
    const username = sanitizeText(row.username);
    if (!email || !isLengthBetween(username, 3, 24) || row.password.length < 6) {
      console.warn("[seed-demo-users] omitido (datos invalidos):", row);
      continue;
    }

    const exists = store.users.some((u) => u.email.toLowerCase() === email);
    if (exists) {
      console.log("[seed-demo-users] ya existe:", email);
      continue;
    }

    const passwordHash = await hashPassword(row.password);
    const user: User = {
      id: createId(),
      username,
      email,
      password: passwordHash,
      bio: sanitizeText(row.bio) ?? "",
      goal: sanitizeText(row.goal) ?? "",
      avatarUrl: sanitizeText(row.avatarUrl) ?? "",
      createdAt: now,
      updatedAt: now,
    };
    store.users.push(user);
    added += 1;
    console.log("[seed-demo-users] añadido:", email);
  }

  if (added > 0) {
    saveStore();
  }

  console.log(`[seed-demo-users] Listo. Nuevos: ${added}. Usuarios en store: ${store.users.length}.`);
  if (added > 0) {
    console.log("[seed-demo-users] Si el API ya estaba en marcha, reinicialo para que lea el store actualizado.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
