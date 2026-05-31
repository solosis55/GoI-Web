import { unlinkSync } from "node:fs";
import { basename, join } from "node:path";
import type { Request } from "express";
import { getAvatarsDir, getBannersDir } from "./uploadPaths.js";

/** URL pública para el cliente (incluye host en desarrollo, cuando front y API van en puertos distintos). */
export function buildPublicAssetUrl(req: Request, pathname: string): string {
  const rawProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim() || req.protocol || "http";
  const proto = rawProto.replace(/:$/, "");
  const host = (req.get("x-forwarded-host") || req.get("host") || "").split(",")[0]?.trim();
  if (!host) return pathname;
  return `${proto}://${host}${pathname}`;
}

export function tryRemoveOldProfileUpload(
  previousUrl: string,
  userId: string,
  kind: "avatars" | "banners",
): void {
  if (!previousUrl || !previousUrl.includes(`/uploads/${kind}/`)) return;
  let name: string;
  try {
    name = basename(new URL(previousUrl).pathname);
  } catch {
    const marker = `/uploads/${kind}/`;
    const i = previousUrl.indexOf(marker);
    name = basename(previousUrl.slice(i + marker.length).split(/[?#]/)[0] ?? "");
  }
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) return;
  if (!name.startsWith(`${userId}-`)) return;
  const dir = kind === "avatars" ? getAvatarsDir() : getBannersDir();
  try {
    unlinkSync(join(dir, name));
  } catch {
    /* ignore missing file */
  }
}
