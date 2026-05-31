import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import multer from "multer";
import type { Request } from "express";
import { getAvatarsDir, getBannersDir } from "../services/uploadPaths.js";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

function extForMime(mime: string): string {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  return ".jpg";
}

export function createProfileImageUploader(kind: "avatars" | "banners") {
  const getDest = kind === "avatars" ? getAvatarsDir : getBannersDir;
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        mkdirSync(getDest(), { recursive: true });
        cb(null, getDest());
      },
      filename: (req, file, cb) => {
        const userId = String((req as Request).params.userId ?? "");
        const ext = extForMime(file.mimetype);
        cb(null, `${userId}-${Date.now().toString(36)}-${randomBytes(5).toString("hex")}${ext}`);
      },
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED.has(file.mimetype)) cb(null, true);
      else cb(new Error("unsupported image type"));
    },
  }).single("file");
}
