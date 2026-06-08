import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../app.js";
import { getPostMediaDir, getPostsUploadRoot } from "../services/uploadPaths.js";
import { store } from "../services/store.js";

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function registerAndLogin(email: string, username: string, password: string) {
  await request(app).post("/api/auth/register").send({ email, username, password }).expect(201);
  const login = await request(app).post("/api/auth/login").send({ email, password }).expect(200);
  return login.body.token as string;
}

describe("POST /api/posts multipart uploads", () => {
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

  it("creates post with uploaded images and persists files on disk", async () => {
    const token = await registerAndLogin("post.up@test.com", "postup", "123456");

    const res = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${token}`)
      .field("content", "Post con foto")
      .field("format", "standard")
      .field("visibility", "public")
      .field("sessionId", "")
      .attach("files", tinyPng, "a.png")
      .attach("files", tinyPng, "b.png");

    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.media).toHaveLength(2);
    expect(res.body.media[0].url).toMatch(/^\/uploads\/posts\/.+\/.+\.png$/);

    const postDir = getPostMediaDir(res.body.id);
    expect(existsSync(postDir)).toBe(true);
    const savedName = res.body.media[0].url.split("/").pop() as string;
    expect(existsSync(join(postDir, savedName))).toBe(true);
  });

  it("allows photo-only post without text", async () => {
    const token = await registerAndLogin("post.photo.only@test.com", "photoonly", "123456");

    const res = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${token}`)
      .field("content", "")
      .field("format", "standard")
      .field("visibility", "public")
      .attach("files", tinyPng, "solo.png");

    expect(res.status).toBe(201);
    expect(res.body.content).toBe("");
    expect(res.body.media).toHaveLength(1);
  });

  it("still accepts JSON posts with data URL media", async () => {
    const token = await registerAndLogin("post.json@test.com", "postjson", "123456");
    const dataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

    const res = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        content: "Legacy JSON",
        visibility: "public",
        media: [{ type: "image", url: dataUrl }],
      });

    expect(res.status).toBe(201);
    expect(res.body.media).toHaveLength(1);
    expect(res.body.media[0].url).toContain("data:image/png");
  });

  it("removes upload dir when post is deleted", async () => {
    const token = await registerAndLogin("post.del@test.com", "postdel", "123456");

    const created = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${token}`)
      .field("content", "Borrar luego")
      .field("visibility", "public")
      .attach("files", tinyPng, "del.png");

    expect(created.status).toBe(201);
    const postId = created.body.id as string;
    expect(existsSync(getPostMediaDir(postId))).toBe(true);

    await request(app)
      .delete(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(existsSync(getPostMediaDir(postId))).toBe(false);
  });

  it("cleans up files when validation fails after upload", async () => {
    const token = await registerAndLogin("post.fail@test.com", "postfail", "123456");
    const dirsBefore = new Set(
      readdirSync(getPostsUploadRoot()).filter((name) => name !== ".gitkeep")
    );

    const res = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${token}`)
      .field("content", "a".repeat(281))
      .field("visibility", "public")
      .attach("files", tinyPng, "fail.png");

    expect(res.status).toBe(400);
    expect(store.posts).toHaveLength(0);
    const dirsAfter = readdirSync(getPostsUploadRoot()).filter((name) => name !== ".gitkeep");
    expect(dirsAfter.filter((name) => !dirsBefore.has(name))).toHaveLength(0);
  });
});
