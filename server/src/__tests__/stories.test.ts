import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../app.js";
import { DEFAULT_EXERCISE_SEED } from "../data/defaultExercises.js";
import { store } from "../services/store.js";

const ONE_PX_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function registerAndLogin(email: string, username: string, password: string) {
  await request(app).post("/api/auth/register").send({ email, username, password }).expect(201);
  const login = await request(app).post("/api/auth/login").send({ email, password }).expect(200);
  return login.body.token as string;
}

describe("stories (instagram-style reels)", () => {
  beforeEach(() => {
    store.users = [];
    store.exercises = DEFAULT_EXERCISE_SEED.map((e) => ({ ...e }));
    store.workouts = [];
    store.workoutSessions = [];
    store.posts = [];
    store.likes = [];
    store.comments = [];
    store.follows = [];
    store.notificationReads = [];
    store.storyReels = [];
  });

  it("creates story with PNG slide", async () => {
    const token = await registerAndLogin("story.author@test.com", "storyowner", "123456");
    const created = await request(app)
      .post("/api/stories")
      .set("Authorization", `Bearer ${token}`)
      .send({ slides: [{ type: "image", url: ONE_PX_PNG }] })
      .expect(201);
    expect(created.body.reel.slides.length).toBe(1);
    expect(store.storyReels.length).toBe(1);
  });

  it("lists follower stories but hides from strangers", async () => {
    const aliceToken = await registerAndLogin("alice.st@test.com", "alice_st", "123456");
    const bobToken = await registerAndLogin("bob.st@test.com", "bob_st", "123456");
    const caraToken = await registerAndLogin("cara.st@test.com", "cara_st", "123456");

    const alice = store.users.find((u) => u.email === "alice.st@test.com");
    const bob = store.users.find((u) => u.email === "bob.st@test.com");
    if (!alice || !bob) throw new Error("users missing");

    await request(app).post(`/api/auth/follow/${alice.id}`).set("Authorization", `Bearer ${bobToken}`).expect(200);

    await request(app)
      .post("/api/stories")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ slides: [{ type: "image", url: ONE_PX_PNG }] })
      .expect(201);

    const bobList = await request(app).get("/api/stories").set("Authorization", `Bearer ${bobToken}`).expect(200);
    expect(Array.isArray(bobList.body.authors)).toBe(true);
    expect(bobList.body.authors.some((x: { userId: string }) => x.userId === alice.id)).toBe(true);

    const caraList = await request(app).get("/api/stories").set("Authorization", `Bearer ${caraToken}`).expect(200);
    expect(caraList.body.authors.some((x: { userId: string }) => x.userId === alice.id)).toBe(false);
  });

  it("rejects empty slides array", async () => {
    const token = await registerAndLogin("empty.st@test.com", "emptyst", "123456");
    const res = await request(app)
      .post("/api/stories")
      .set("Authorization", `Bearer ${token}`)
      .send({ slides: [] });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("STORY_INVALID_SLIDES");
  });
});
