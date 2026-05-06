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

describe("workout sessions API", () => {
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

  it("rejects listing sessions without token", async () => {
    const response = await request(app).get("/api/workout-sessions");
    expect(response.status).toBe(401);
    expect(response.body.code).toBe("AUTH_HEADER_INVALID");
  });

  it("creates and lists a session for own workout", async () => {
    const token = await registerAndLogin("session.owner@test.com", "sessionowner", "123456");

    const created = await request(app)
      .post("/api/workouts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Rutina A",
        description: "",
        exerciseIds: [SAMPLE_EXERCISE_ID],
      })
      .expect(201);

    const workoutId = created.body.id as string;

    const postSession = await request(app)
      .post("/api/workout-sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        workoutId,
        notes: "Buena sesion",
      })
      .expect(201);

    expect(postSession.body.id).toBeTruthy();
    expect(postSession.body.workoutId).toBe(workoutId);

    const list = await request(app).get("/api/workout-sessions").set("Authorization", `Bearer ${token}`).expect(200);

    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].workoutTitle).toBe("Rutina A");
    expect(list.body[0].notes).toBe("Buena sesion");
  });

  it("rejects session creation for another users workout", async () => {
    const ownerToken = await registerAndLogin("session.owner2@test.com", "sessionowner2", "123456");
    const otherToken = await registerAndLogin("session.other@test.com", "sessionother", "123456");

    const created = await request(app)
      .post("/api/workouts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        title: "Privado",
        description: "",
        exerciseIds: [],
      })
      .expect(201);

    const response = await request(app)
      .post("/api/workout-sessions")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ workoutId: created.body.id });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("WORKOUT_FORBIDDEN");
  });

  it("prevents deleting another users session", async () => {
    const ownerToken = await registerAndLogin("session.del.owner@test.com", "sessiondelowner", "123456");
    const intruderToken = await registerAndLogin("session.del.bad@test.com", "sessiondelbad", "123456");

    const created = await request(app)
      .post("/api/workouts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ title: "Para sesion", description: "", exerciseIds: [SAMPLE_EXERCISE_ID] })
      .expect(201);

    const sessionRes = await request(app)
      .post("/api/workout-sessions")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ workoutId: created.body.id })
      .expect(201);

    const sessionId = sessionRes.body.id as string;

    const response = await request(app)
      .delete(`/api/workout-sessions/${sessionId}`)
      .set("Authorization", `Bearer ${intruderToken}`);

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("WORKOUT_SESSION_FORBIDDEN");
  });
});
