import { existsSync } from "node:fs";
import { join } from "node:path";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../app.js";
import { getAvatarsDir } from "../services/uploadPaths.js";
import { store } from "../services/store.js";

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function registerAndLogin(email: string, username: string, password: string) {
  await request(app).post("/api/auth/register").send({ email, username, password }).expect(201);
  const login = await request(app).post("/api/auth/login").send({ email, password }).expect(200);
  return { token: login.body.token as string, userId: login.body.user.id as string };
}

describe("profile image uploads", () => {
  beforeEach(() => {
    store.users = [];
    store.exercises = [];
    store.workouts = [];
    store.workoutSessions = [];
    store.posts = [];
    store.likes = [];
    store.comments = [];
    store.follows = [];
    store.storyReels = [];
  });

  it("returns public url and writes file under avatars", async () => {
    const { token, userId } = await registerAndLogin("avatar-up@test.com", "avatarup", "123456");
    const res = await request(app)
      .post(`/api/auth/profile/${userId}/avatar`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", tinyPng, "x.png")
      .expect(200);

    expect(typeof res.body.url).toBe("string");
    expect(res.body.url).toContain("/uploads/avatars/");
    const name = res.body.url.split("/").pop() as string;
    expect(name.length).toBeGreaterThan(4);
    expect(existsSync(join(getAvatarsDir(), name))).toBe(true);
  });

  it("rejects upload for another user id", async () => {
    const a = await registerAndLogin("a-up@test.com", "aup", "123456");
    const b = await registerAndLogin("b-up@test.com", "bup", "123456");
    const res = await request(app)
      .post(`/api/auth/profile/${b.userId}/avatar`)
      .set("Authorization", `Bearer ${a.token}`)
      .attach("file", tinyPng, "x.png");
    expect(res.status).toBe(403);
  });
});
