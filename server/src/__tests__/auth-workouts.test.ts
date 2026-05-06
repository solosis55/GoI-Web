import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../app.js";
import { DEFAULT_EXERCISE_SEED } from "../data/defaultExercises.js";
import { store } from "../services/store.js";

const SAMPLE_EXERCISE_ID = DEFAULT_EXERCISE_SEED[0]!.id;

async function registerAndLogin(email: string, username: string, password: string) {
  await request(app).post("/api/auth/register").send({ email, username, password }).expect(201);
  const login = await request(app).post("/api/auth/login").send({ email, password }).expect(200);
  return login.body.token as string;
}

describe("auth + workouts security flow", () => {
  /** Memoria aislada: `saveStore()` no escribe disco bajo Vitest (ver `store.ts`). Sin backup/restore de `store.json` para no pisar datos de desarrollo. */

  beforeEach(() => {
    store.users = [];
    store.exercises = DEFAULT_EXERCISE_SEED.map((e) => ({ ...e }));
    store.workouts = [];
    store.workoutSessions = [];
    store.posts = [];
    store.likes = [];
    store.comments = [];
    store.follows = [];
    store.storyReels = [];
  });

  it("returns standardized error on invalid login", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "no-user@test.com",
      password: "badpass",
    });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("AUTH_INVALID_CREDENTIALS");
    expect(typeof response.body.message).toBe("string");
  });

  it("rejects workout creation without token", async () => {
    const response = await request(app).post("/api/workouts").send({
      title: "No token",
      description: "x",
      exerciseIds: [],
    });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("AUTH_HEADER_INVALID");
  });

  it("allows workout creation with valid token", async () => {
    const token = await registerAndLogin("owner@test.com", "owner", "123456");
    const response = await request(app)
      .post("/api/workouts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Secure workout",
        description: "test",
        exerciseIds: [SAMPLE_EXERCISE_ID],
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toBeTruthy();
    expect(response.body.title).toBe("Secure workout");
    expect(Array.isArray(response.body.tags)).toBe(true);
  });

  it("prevents deleting workout owned by another user", async () => {
    const ownerToken = await registerAndLogin("owner2@test.com", "owner2", "123456");
    const intruderToken = await registerAndLogin("intruder@test.com", "intruder", "123456");

    const created = await request(app)
      .post("/api/workouts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        title: "Owner workout",
        description: "private",
        exerciseIds: [SAMPLE_EXERCISE_ID],
      })
      .expect(201);

    const response = await request(app)
      .delete(`/api/workouts/${created.body.id}`)
      .set("Authorization", `Bearer ${intruderToken}`);

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("WORKOUT_FORBIDDEN");
  });

  it("rejects GET profile without authorization", async () => {
    await registerAndLogin("nauth.profile@test.com", "nauthprofile", "123456");
    const userId = store.users.find((u) => u.username === "nauthprofile")!.id;

    const response = await request(app).get(`/api/auth/profile/${userId}`);
    expect(response.status).toBe(401);
    expect(response.body.code).toBe("AUTH_HEADER_INVALID");
  });

  it("includes email only when viewing own profile", async () => {
    await registerAndLogin("owner.pub@test.com", "ownerpub", "123456");
    const viewerToken = await registerAndLogin("viewer.pub@test.com", "viewerpub", "123456");
    const ownerId = store.users.find((u) => u.username === "ownerpub")!.id;
    const ownerToken = (
      await request(app).post("/api/auth/login").send({ email: "owner.pub@test.com", password: "123456" })
    ).body.token as string;

    const ownView = await request(app)
      .get(`/api/auth/profile/${ownerId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);

    expect(ownView.body.user.email).toBe("owner.pub@test.com");

    const otherView = await request(app)
      .get(`/api/auth/profile/${ownerId}`)
      .set("Authorization", `Bearer ${viewerToken}`)
      .expect(200);

    expect(otherView.body.user.email).toBeUndefined();
    expect(otherView.body.user.username).toBe("ownerpub");
  });

  it("prevents updating profile of another user", async () => {
    await registerAndLogin("profile.owner@test.com", "profileowner", "123456");
    const intruderToken = await registerAndLogin("profile.intruder@test.com", "profileintruder", "123456");

    const ownerLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "profile.owner@test.com", password: "123456" })
      .expect(200);

    const ownerId = ownerLogin.body.user.id as string;

    const response = await request(app)
      .put(`/api/auth/profile/${ownerId}`)
      .set("Authorization", `Bearer ${intruderToken}`)
      .send({ username: "hacked-name" });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("AUTH_FORBIDDEN");
  });

  describe("password reset", () => {
    it("rejects forgot-password with invalid email", async () => {
      const response = await request(app).post("/api/auth/forgot-password").send({ email: "   " });
      expect(response.status).toBe(400);
      expect(response.body.code).toBe("AUTH_FORGOT_PASSWORD_INVALID_INPUT");
    });

    it("returns generic message for unknown email without leaking token", async () => {
      const response = await request(app).post("/api/auth/forgot-password").send({ email: "nobody@example.com" });
      expect(response.status).toBe(200);
      expect(typeof response.body.message).toBe("string");
      expect(response.body.devResetToken).toBeUndefined();
    });

    it("allows full reset when AUTH_RESET_RETURN_TOKEN is true", async () => {
      const previous = process.env.AUTH_RESET_RETURN_TOKEN;
      process.env.AUTH_RESET_RETURN_TOKEN = "true";
      try {
        await request(app)
          .post("/api/auth/register")
          .send({ email: "reset-user@test.com", username: "resetuser", password: "oldpass" })
          .expect(201);

        const forgot = await request(app)
          .post("/api/auth/forgot-password")
          .send({ email: "reset-user@test.com" })
          .expect(200);

        expect(typeof forgot.body.devResetToken).toBe("string");
        expect(forgot.body.devResetToken.length).toBeGreaterThan(10);

        await request(app)
          .post("/api/auth/reset-password")
          .send({ token: forgot.body.devResetToken, password: "newpass9" })
          .expect(200);

        const loginOld = await request(app).post("/api/auth/login").send({
          email: "reset-user@test.com",
          password: "oldpass",
        });
        expect(loginOld.status).toBe(401);

        const loginNew = await request(app)
          .post("/api/auth/login")
          .send({ email: "reset-user@test.com", password: "newpass9" })
          .expect(200);

        expect(loginNew.body.token).toBeTruthy();
      } finally {
        process.env.AUTH_RESET_RETURN_TOKEN = previous;
      }
    });

    it("rejects reset with invalid token", async () => {
      const response = await request(app)
        .post("/api/auth/reset-password")
        .send({ token: "not-a-valid-token", password: "123456" });
      expect(response.status).toBe(400);
      expect(response.body.code).toBe("AUTH_RESET_TOKEN_INVALID");
    });
  });
});

