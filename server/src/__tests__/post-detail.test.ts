import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../app.js";
import { store } from "../services/store.js";

async function registerAndLogin(email: string, username: string, password: string) {
  await request(app).post("/api/auth/register").send({ email, username, password }).expect(201);
  const login = await request(app).post("/api/auth/login").send({ email, password }).expect(200);
  return login.body.token as string;
}

describe("GET /api/posts/:id", () => {
  beforeEach(() => {
    store.users = [];
    store.posts = [];
    store.likes = [];
    store.comments = [];
    store.follows = [];
  });

  it("returns post detail for authorized viewer", async () => {
    const token = await registerAndLogin("post.detail@test.com", "postdetail", "123456");
    const user = store.users.find((u) => u.username === "postdetail")!;
    const now = new Date().toISOString();

    store.posts.push({
      id: "p-detail",
      userId: user.id,
      content: "Detalle del post",
      media: [{ type: "image", url: "/uploads/posts/detail.jpg" }],
      workoutId: null,
      visibility: "public",
      createdAt: now,
      updatedAt: now,
    });

    const res = await request(app)
      .get("/api/posts/p-detail")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe("p-detail");
    expect(res.body.content).toBe("Detalle del post");
    expect(res.body.media).toHaveLength(1);
  });

  it("hides private posts from other users", async () => {
    await registerAndLogin("post.owner.private@test.com", "privateowner", "123456");
    await registerAndLogin("post.viewer.private@test.com", "privateviewer", "123456");
    const owner = store.users.find((u) => u.username === "privateowner")!;
    const viewer = store.users.find((u) => u.username === "privateviewer")!;
    const viewerToken = (
      await request(app)
        .post("/api/auth/login")
        .send({ email: "post.viewer.private@test.com", password: "123456" })
    ).body.token as string;
    const now = new Date().toISOString();

    store.posts.push({
      id: "p-private",
      userId: owner.id,
      content: "Solo yo",
      workoutId: null,
      visibility: "private",
      createdAt: now,
      updatedAt: now,
    });

    const res = await request(app)
      .get("/api/posts/p-private")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(404);
    expect(viewer.id).not.toBe(owner.id);
  });
});
