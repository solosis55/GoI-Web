import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import app from "../app.js";
import { store } from "../services/store.js";

const storeFilePath = resolve(process.cwd(), "data/store.json");

let originalStoreContent = "";

async function registerAndLogin(email: string, username: string, password: string) {
  await request(app).post("/api/auth/register").send({ email, username, password }).expect(201);
  const login = await request(app).post("/api/auth/login").send({ email, password }).expect(200);
  return login.body.token as string;
}

describe("auth + workouts security flow", () => {
  beforeAll(() => {
    originalStoreContent = readFileSync(storeFilePath, "utf-8");
  });

  beforeEach(() => {
    store.users = [];
    store.workouts = [];
    store.workoutSessions = [];
    store.posts = [];
    store.likes = [];
    store.comments = [];
    store.follows = [];
  });

  afterAll(() => {
    writeFileSync(storeFilePath, originalStoreContent, "utf-8");
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
      exercises: [],
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
        exercises: ["press"],
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
        exercises: ["squat"],
      })
      .expect(201);

    const response = await request(app)
      .delete(`/api/workouts/${created.body.id}`)
      .set("Authorization", `Bearer ${intruderToken}`);

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("WORKOUT_FORBIDDEN");
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

