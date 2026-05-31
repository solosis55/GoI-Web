/** Límite simple en memoria: follows por usuario por hora (anti-spam). */
const WINDOW_MS = 60 * 60 * 1000;
const MAX_FOLLOWS_PER_WINDOW = 40;

const buckets = new Map<string, number[]>();

export function checkFollowRateLimit(userId: string): boolean {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const prev = buckets.get(userId) ?? [];
  const recent = prev.filter((t) => t >= cutoff);
  if (recent.length >= MAX_FOLLOWS_PER_WINDOW) return false;
  recent.push(now);
  buckets.set(userId, recent);
  return true;
}

export function resetFollowRateLimitForTests(): void {
  buckets.clear();
}
