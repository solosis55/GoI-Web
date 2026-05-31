import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../app.js";
import { store } from "../services/store.js";

async function registerAndLogin(email: string, username: string, password: string) {
  await request(app).post("/api/auth/register").send({ email, username, password }).expect(201);
  const login = await request(app).post("/api/auth/login").send({ email, password }).expect(200);
  return login.body.token as string;
}

describe("GET /api/posts/feed", () => {
  beforeEach(() => {
    store.users = [];
    store.posts = [];
    store.workouts = [];
    store.workoutSessions = [];
    store.follows = [];
    store.likes = [];
    store.comments = [];
  });

  it("returns following scope with posts and workout events", async () => {
    const viewerToken = await registerAndLogin("feed.viewer@test.com", "feedviewer", "123456");
    await registerAndLogin("feed.friend@test.com", "feedfriend", "123456");

    const viewer = store.users.find((u) => u.username === "feedviewer")!;
    const friend = store.users.find((u) => u.username === "feedfriend")!;

    store.follows.push({
      id: "f1",
      followerId: viewer.id,
      followingId: friend.id,
      status: "accepted",
      createdAt: new Date().toISOString(),
    });

    const now = new Date().toISOString();
    store.posts.push({
      id: "p1",
      userId: friend.id,
      content: "Hola feed",
      workoutId: null,
      media: [],
      visibility: "public",
      createdAt: now,
      updatedAt: now,
    });

    store.workouts.push({
      id: "w1",
      userId: friend.id,
      title: "Pecho",
      exercises: [],
      createdAt: now,
      updatedAt: now,
    });

    store.workoutSessions.push({
      id: "s1",
      userId: friend.id,
      workoutId: "w1",
      performedAt: now,
      notes: "",
      createdAt: now,
    });

    const res = await request(app)
      .get("/api/posts/feed?scope=following&limit=20")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(2);
    const kinds = res.body.items.map((i: { kind: string }) => i.kind);
    expect(kinds).toContain("post");
    expect(kinds).toContain("workout");
  });

  it("hides workout event when a post covers the same session window", async () => {
    const viewerToken = await registerAndLogin("feed.cover.viewer@test.com", "coverviewer", "123456");
    await registerAndLogin("feed.cover.friend@test.com", "coverfriend", "123456");

    const viewer = store.users.find((u) => u.username === "coverviewer")!;
    const friend = store.users.find((u) => u.username === "coverfriend")!;

    store.follows.push({
      id: "f2",
      followerId: viewer.id,
      followingId: friend.id,
      status: "accepted",
      createdAt: new Date().toISOString(),
    });

    const performedAt = new Date().toISOString();
    store.workouts.push({
      id: "w2",
      userId: friend.id,
      title: "Espalda",
      exercises: [],
      createdAt: performedAt,
      updatedAt: performedAt,
    });

    store.workoutSessions.push({
      id: "s2",
      userId: friend.id,
      workoutId: "w2",
      performedAt,
      notes: "",
      createdAt: performedAt,
    });

    store.posts.push({
      id: "p2",
      userId: friend.id,
      content: "Sesión con foto",
      workoutId: "w2",
      media: [],
      visibility: "public",
      createdAt: performedAt,
      updatedAt: performedAt,
    });

    const res = await request(app)
      .get("/api/posts/feed?scope=following")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    const workoutItems = res.body.items.filter((i: { kind: string }) => i.kind === "workout");
    expect(workoutItems).toHaveLength(0);
    expect(res.body.items.some((i: { kind: string }) => i.kind === "post")).toBe(true);
  });

  it("paginates with cursor", async () => {
    const viewerToken = await registerAndLogin("feed.page.viewer@test.com", "pageviewer", "123456");
    const viewer = store.users.find((u) => u.username === "pageviewer")!;

    for (let i = 0; i < 3; i++) {
      const t = new Date(Date.now() - i * 60_000).toISOString();
      store.posts.push({
        id: `pp${i}`,
        userId: viewer.id,
        content: `Post ${i}`,
        workoutId: null,
        media: [],
        visibility: "public",
        createdAt: t,
        updatedAt: t,
      });
    }

    const page1 = await request(app)
      .get("/api/posts/feed?scope=all&limit=2")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(page1.status).toBe(200);
    expect(page1.body.items).toHaveLength(2);
    expect(page1.body.hasMore).toBe(true);
    expect(page1.body.nextCursor).toBeTruthy();

    const page2 = await request(app)
      .get(`/api/posts/feed?scope=all&limit=2&cursor=${encodeURIComponent(page1.body.nextCursor)}`)
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(page2.status).toBe(200);
    expect(page2.body.items.length).toBeGreaterThanOrEqual(1);
  });
});
