import { Request, Response } from "express";
import { getPersistedStorePath, store } from "../services/store.js";

export function getHealth(_req: Request, res: Response) {
  const base = {
    ok: true,
    service: "social-sport-backend",
    timestamp: new Date().toISOString(),
  };
  const prodLike = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
  if (prodLike) {
    res.json(base);
    return;
  }

  res.json({
    ...base,
    devStore: {
      usersLoaded: store.users.length,
      storeFile: getPersistedStorePath(),
    },
  });
}
