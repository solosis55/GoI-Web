import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { MulterError } from "multer";
import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import { createId } from "../services/store.js";
import { POST_MEDIA_MAX_ITEMS } from "../services/postMedia.js";
import { getPostMediaDir } from "../services/uploadPaths.js";
import { sendError } from "../services/http.js";
import { tryRemovePostUploadDir } from "../services/postUploads.js";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_BYTES = 4 * 1024 * 1024;

export type PostUploadRequest = Request & {
  draftPostId?: string;
  files?: Express.Multer.File[];
};

function extForMime(mime: string): string {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  return ".jpg";
}

const postImageUploader = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const draftPostId = (req as PostUploadRequest).draftPostId;
      if (!draftPostId) {
        cb(new Error("missing draft post id"), "");
        return;
      }
      const dir = getPostMediaDir(draftPostId);
      mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = extForMime(file.mimetype);
      cb(null, `${Date.now().toString(36)}-${randomBytes(5).toString("hex")}${ext}`);
    },
  }),
  limits: { fileSize: MAX_FILE_BYTES, files: POST_MEDIA_MAX_ITEMS },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(new Error("unsupported image type"));
  },
}).array("files", POST_MEDIA_MAX_ITEMS);

export function preparePostDraftId(req: Request, _res: Response, next: NextFunction) {
  (req as PostUploadRequest).draftPostId = createId();
  next();
}

export function handlePostImageMulter(req: Request, res: Response, next: NextFunction) {
  postImageUploader(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    const draftPostId = (req as PostUploadRequest).draftPostId;
    if (draftPostId) tryRemovePostUploadDir(draftPostId);

    if (err instanceof MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        sendError(res, 413, "POST_MEDIA_TOO_LARGE", "max size is 4 MB per image");
        return;
      }
      if (err.code === "LIMIT_FILE_COUNT") {
        sendError(res, 400, "POST_MEDIA_INVALID", `max ${POST_MEDIA_MAX_ITEMS} images`);
        return;
      }
      sendError(res, 400, "POST_MEDIA_INVALID", err.message);
      return;
    }
    const msg = err instanceof Error ? err.message : "invalid file";
    sendError(res, 400, "POST_MEDIA_INVALID", msg);
  });
}

export function runPostCreateUpload(req: Request, res: Response, next: NextFunction) {
  const ct = String(req.headers["content-type"] ?? "");
  if (!ct.includes("multipart/form-data")) {
    next();
    return;
  }
  preparePostDraftId(req, res, () => {
    handlePostImageMulter(req, res, next);
  });
}

export function cleanupDraftPostUploads(req: Request): void {
  const draftPostId = (req as PostUploadRequest).draftPostId;
  if (draftPostId) tryRemovePostUploadDir(draftPostId);
}
