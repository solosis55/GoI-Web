/** Cursor de feed/perfil (mismo formato que Goi Server `postCursor.ts`). */
export function encodePostCursor(post: { createdAt: string; id: string }): string {
  const json = JSON.stringify({ c: post.createdAt, i: post.id });
  const b64 = btoa(json);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
