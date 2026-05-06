/**
 * Upsert de cuentas DEMO_USERS:
 * - Si no existe el email, crea el usuario.
 * - Si existe, actualiza perfil y restablece password a la del seed.
 *
 * Uso: desde `server/`, `npm run reset:demo-users`
 */
import { DEMO_USERS } from "../src/data/demoUsers.js";
import { hashPassword } from "../src/services/auth.js";
import { createId, initializeStore, saveStore, store, type User } from "../src/services/store.js";
import { isLengthBetween, normalizeEmail, sanitizeText } from "../src/services/validation.js";

async function main() {
  initializeStore();
  const now = new Date().toISOString();
  let created = 0;
  let updated = 0;

  for (const row of DEMO_USERS) {
    const email = normalizeEmail(row.email);
    const username = sanitizeText(row.username);
    if (!email || !isLengthBetween(username, 3, 24) || row.password.length < 6) {
      console.warn("[reset-demo-users] omitido (datos invalidos):", row);
      continue;
    }

    const passwordHash = await hashPassword(row.password);
    const existing = store.users.find((u) => u.email.toLowerCase() === email);

    if (existing) {
      existing.username = username;
      existing.password = passwordHash;
      existing.bio = sanitizeText(row.bio) ?? "";
      existing.goal = sanitizeText(row.goal) ?? "";
      existing.avatarUrl = sanitizeText(row.avatarUrl) ?? "";
      existing.updatedAt = now;
      updated += 1;
      console.log("[reset-demo-users] actualizado:", email);
      continue;
    }

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
    created += 1;
    console.log("[reset-demo-users] creado:", email);
  }

  saveStore();
  console.log(
    `[reset-demo-users] Listo. Creados: ${created}. Actualizados: ${updated}. Total usuarios: ${store.users.length}.`
  );
  console.log("[reset-demo-users] Si el API estaba en marcha, reinicialo para recargar el store.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
