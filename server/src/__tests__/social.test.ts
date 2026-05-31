import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../app.js";
import { store } from "../services/store.js";
import { resetFollowRateLimitForTests } from "../services/followRateLimit.js";

async function registerAndLogin(email: string, username: string, password: string) {
  await request(app).post("/api/auth/register").send({ email, username, password }).expect(201);
  const login = await request(app).post("/api/auth/login").send({ email, password }).expect(200);
  return login.body.token as string;
}

describe("Social API", () => {
  beforeEach(() => {
    store.users = [];
    store.follows = [];
    store.posts = [];
    store.workoutSessions = [];
    store.workouts = [];
    store.userBlocks = [];
    resetFollowRateLimitForTests();
  });

  it("GET /api/auth/social/hub returns aggregated payload", async () => {
    const token = await registerAndLogin("hub.viewer@test.com", "hubviewer", "123456");
    const res = await request(app).get("/api/auth/social/hub").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.discoverUsers).toBeDefined();
    expect(res.body.weekly).toBeDefined();
    expect(typeof res.body.weekly.mySessionsWeek).toBe("number");
  });

  it("GET /api/auth/social/hub?lite=1 returns smaller discover preview", async () => {
    const token = await registerAndLogin("hub.lite@test.com", "hublite", "123456");
    for (let i = 0; i < 20; i++) {
      await registerAndLogin(`hub.extra${i}@test.com`, `hubextra${i}`, "123456");
    }
    const full = await request(app)
      .get("/api/auth/social/hub")
      .set("Authorization", `Bearer ${token}`);
    const lite = await request(app)
      .get("/api/auth/social/hub?lite=1")
      .set("Authorization", `Bearer ${token}`);
    expect(full.status).toBe(200);
    expect(lite.status).toBe(200);
    expect(lite.body.discoverUsers.length).toBeLessThanOrEqual(full.body.discoverUsers.length);
    expect(lite.body.discoverUsers.length).toBeLessThanOrEqual(12);
  });

  it("GET /api/auth/users/previews resolves usernames by id", async () => {
    const token = await registerAndLogin("prev.viewer@test.com", "prevviewer", "123456");
    await request(app)
      .post("/api/auth/register")
      .send({ email: "prev.target@test.com", username: "targetuser", password: "123456" });
    const target = store.users.find((u) => u.username === "targetuser")!;
    const res = await request(app)
      .get(`/api/auth/users/previews?ids=${target.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.users[0].username).toBe("targetuser");
  });

  it("GET /api/auth/users/search finds by username", async () => {
    const token = await registerAndLogin("search.viewer@test.com", "searchviewer", "123456");
    await registerAndLogin("search.target@test.com", "powerlifter99", "123456");
    const res = await request(app)
      .get("/api/auth/users/search?q=power")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.users.some((u: { username: string }) => u.username === "powerlifter99")).toBe(true);
  });

  it("GET /api/auth/discover respects facet=trained", async () => {
    const viewerToken = await registerAndLogin("facet.viewer@test.com", "facetviewer", "123456");
    await registerAndLogin("facet.trainee@test.com", "facettrainee", "123456");

    const trainee = store.users.find((u) => u.username === "facettrainee")!;
    store.workoutSessions.push({
      id: "ws-f1",
      userId: trainee.id,
      workoutId: "w-f1",
      performedAt: new Date().toISOString(),
      notes: "",
      createdAt: new Date().toISOString(),
    });

    const res = await request(app)
      .get("/api/auth/discover?facet=trained&limit=24")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.facet).toBe("trained");
    expect(res.body.users.every((u: { trainedThisWeek?: boolean }) => u.trainedThisWeek)).toBe(true);
  });

  it("PUT /api/auth/notification-prefs persists muted types", async () => {
    const token = await registerAndLogin("prefs.user@test.com", "prefsuser", "123456");
    const put = await request(app)
      .put("/api/auth/notification-prefs")
      .set("Authorization", `Bearer ${token}`)
      .send({ mutedTypes: ["like"] });
    expect(put.status).toBe(200);
    expect(put.body.prefs.mutedTypes).toEqual(["like"]);

    const get = await request(app)
      .get("/api/auth/notification-prefs")
      .set("Authorization", `Bearer ${token}`);
    expect(get.body.prefs.mutedTypes).toEqual(["like"]);
  });
});
