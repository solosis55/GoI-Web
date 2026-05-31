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

describe("GET /api/auth/discover", () => {
  beforeEach(() => {
    store.users = [];
    store.follows = [];
    store.posts = [];
    store.workoutSessions = [];
    resetFollowRateLimitForTests();
  });

  it("excludes private profiles and ranks public matches", async () => {
    const viewerToken = await registerAndLogin("disc.viewer@test.com", "discviewer", "123456");
    await registerAndLogin("disc.private@test.com", "discprivate", "123456");
    await registerAndLogin("disc.match@test.com", "discmatch", "123456");

    const viewer = store.users.find((u) => u.username === "discviewer")!;
    viewer.goal = "Powerlifting";
    viewer.location = "Madrid";

    const priv = store.users.find((u) => u.username === "discprivate")!;
    priv.profileVisibility = "private";

    const match = store.users.find((u) => u.username === "discmatch")!;
    match.profileVisibility = "public";
    match.goal = "Powerlifting";
    match.location = "Madrid";

    const res = await request(app)
      .get("/api/auth/discover")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
    expect(res.body.users[0].username).toBe("discmatch");
    expect(res.body.users[0].reason).toContain("Powerlifting");
    expect(res.body.total).toBe(1);
    expect(res.body.nextOffset).toBeNull();
  });

  it("paginates with offset and exposes trainedThisWeek", async () => {
    const viewerToken = await registerAndLogin("pag.viewer@test.com", "pagviewer", "123456");
    await registerAndLogin("pag.trainee@test.com", "pagtrainee", "123456");
    await registerAndLogin("pag.other@test.com", "pagother", "123456");

    const trainee = store.users.find((u) => u.username === "pagtrainee")!;
    const other = store.users.find((u) => u.username === "pagother")!;
    trainee.profileVisibility = "public";
    other.profileVisibility = "public";

    store.workoutSessions.push({
      id: "s1",
      userId: trainee.id,
      workoutId: "w1",
      performedAt: new Date().toISOString(),
      notes: "",
      createdAt: new Date().toISOString(),
    });

    const page1 = await request(app)
      .get("/api/auth/discover?limit=1&offset=0")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(page1.status).toBe(200);
    expect(page1.body.users).toHaveLength(1);
    expect(page1.body.users[0].trainedThisWeek).toBe(true);
    expect(page1.body.total).toBe(2);
    expect(page1.body.nextOffset).toBe(1);
  });
});

describe("POST /api/auth/follow rate limit", () => {
  beforeEach(() => {
    store.users = [];
    store.follows = [];
    resetFollowRateLimitForTests();
  });

  it("returns 429 after too many follow actions", async () => {
    const token = await registerAndLogin("rate.viewer@test.com", "rateviewer", "123456");
    const viewer = store.users.find((u) => u.username === "rateviewer")!;

    for (let i = 0; i < 41; i++) {
      const email = `rate.target${i}@test.com`;
      await request(app)
        .post("/api/auth/register")
        .send({ email, username: `ratetarget${i}`, password: "123456" });
      const target = store.users.find((u) => u.email === email)!;
      target.profileVisibility = "public";
      const res = await request(app)
        .post(`/api/auth/follow/${target.id}`)
        .set("Authorization", `Bearer ${token}`);
      if (i < 40) expect(res.status).toBe(200);
      else expect(res.status).toBe(429);
    }
    expect(viewer.id).toBeTruthy();
  });
});
