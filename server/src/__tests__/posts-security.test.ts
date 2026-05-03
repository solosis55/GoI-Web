import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../app.js";
import { store } from "../services/store.js";

async function registerAndLogin(email: string, username: string, password: string) {
  await request(app).post("/api/auth/register").send({ email, username, password }).expect(201);
  const login = await request(app).post("/api/auth/login").send({ email, password }).expect(200);
  return login.body.token as string;
}

describe("posts security flow", () => {
  beforeEach(() => {
    store.users = [];
    store.workouts = [];
    store.workoutSessions = [];
    store.posts = [];
    store.likes = [];
    store.comments = [];
    store.follows = [];
  });

  it("rejects post creation without token", async () => {
    const response = await request(app).post("/api/posts").send({
      content: "Sin token",
      workoutId: null,
    });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("AUTH_HEADER_INVALID");
  });

  it("creates post with valid token", async () => {
    const token = await registerAndLogin("post.owner@test.com", "postowner", "123456");
    const response = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        content: "Post seguro",
        workoutId: null,
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toBeTruthy();
    expect(response.body.content).toBe("Post seguro");
  });

  it("rejects like and comment without token", async () => {
    const ownerToken = await registerAndLogin("owner.like@test.com", "ownerlike", "123456");
    const created = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        content: "Post para interacciones",
        workoutId: null,
      })
      .expect(201);

    const likeResponse = await request(app).post(`/api/posts/${created.body.id}/likes`).send({});
    const commentResponse = await request(app).post(`/api/posts/${created.body.id}/comments`).send({
      content: "hola",
    });

    expect(likeResponse.status).toBe(401);
    expect(likeResponse.body.code).toBe("AUTH_HEADER_INVALID");
    expect(commentResponse.status).toBe(401);
    expect(commentResponse.body.code).toBe("AUTH_HEADER_INVALID");
  });

  it("prevents deleting post owned by another user", async () => {
    const ownerToken = await registerAndLogin("owner.post@test.com", "ownerpost", "123456");
    const intruderToken = await registerAndLogin("intruder.post@test.com", "intruderpost", "123456");

    const created = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        content: "Post del owner",
        workoutId: null,
      })
      .expect(201);

    const response = await request(app)
      .delete(`/api/posts/${created.body.id}`)
      .set("Authorization", `Bearer ${intruderToken}`);

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("POST_FORBIDDEN");
  });
});

