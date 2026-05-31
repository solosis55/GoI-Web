import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../app.js";
import { store } from "../services/store.js";

async function registerAndLogin(email: string, username: string, password: string) {
  await request(app).post("/api/auth/register").send({ email, username, password }).expect(201);
  const login = await request(app).post("/api/auth/login").send({ email, password }).expect(200);
  return login.body.token as string;
}

describe("GET /api/auth/profile/:userId/public", () => {
  beforeEach(() => {
    store.users = [];
    store.follows = [];
    store.posts = [];
    store.workoutSessions = [];
    store.workouts = [];
    store.likes = [];
    store.comments = [];
  });

  it("returns restricted profile for followers-only when not following", async () => {
    await registerAndLogin("pub.owner@test.com", "pubowner", "123456");
    const viewerToken = await registerAndLogin("pub.viewer@test.com", "pubviewer", "123456");
    const ownerId = store.users.find((u) => u.username === "pubowner")!.id;

    const owner = store.users.find((u) => u.id === ownerId)!;
    owner.profileVisibility = "followers";
    owner.bio = "secret bio";

    const res = await request(app)
      .get(`/api/auth/profile/${ownerId}/public`)
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.restricted).toBe(true);
    expect(res.body.user.bio).toBe("");
    expect(res.body.posts.posts).toEqual([]);
  });

  it("lists social connections when profile is visible", async () => {
    await registerAndLogin("soc.owner@test.com", "socowner", "123456");
    const fanToken = await registerAndLogin("soc.fan@test.com", "socfan", "123456");
    const ownerId = store.users.find((u) => u.username === "socowner")!.id;
    const fanId = store.users.find((u) => u.username === "socfan")!.id;

    await request(app)
      .post(`/api/auth/follow/${ownerId}`)
      .set("Authorization", `Bearer ${fanToken}`);

    const res = await request(app)
      .get(`/api/auth/profile/${ownerId}/social/followers`)
      .set("Authorization", `Bearer ${fanToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.users[0].id).toBe(fanId);
  });
});
