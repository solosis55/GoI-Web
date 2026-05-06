import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../app.js";
import { EXERCISE_DETAILS_BY_ID } from "../data/exerciseDetails.js";
import { DEFAULT_EXERCISE_SEED } from "../data/defaultExercises.js";
import { store, type Exercise } from "../services/store.js";

async function registerAndLogin(email: string, username: string, password: string) {
  await request(app).post("/api/auth/register").send({ email, username, password }).expect(201);
  const login = await request(app).post("/api/auth/login").send({ email, password }).expect(200);
  return login.body.token as string;
}

describe("exercises API", () => {
  beforeEach(() => {
    store.users = [];
    store.exercises = DEFAULT_EXERCISE_SEED.map((e) => {
      const base: Exercise = {
        id: e.id,
        name: e.name,
        muscles: [...e.muscles],
        equipmentTags: [...e.equipmentTags],
      };
      const d = EXERCISE_DETAILS_BY_ID[e.id];
      if (d) {
        base.equipment = d.equipment;
        base.description = d.description;
        base.instructions = d.instructions;
      }
      return base;
    });
    store.workouts = [];
    store.workoutSessions = [];
    store.posts = [];
    store.likes = [];
    store.comments = [];
    store.follows = [];
    store.storyReels = [];
  });

  it("rejects GET exercise without token", async () => {
    const id = DEFAULT_EXERCISE_SEED[0]!.id;
    const response = await request(app).get(`/api/exercises/${id}`);
    expect(response.status).toBe(401);
  });

  it("returns one exercise by id", async () => {
    const token = await registerAndLogin("ex.catalog@test.com", "excatalog", "123456");
    const seed = DEFAULT_EXERCISE_SEED[0]!;
    const response = await request(app)
      .get(`/api/exercises/${seed.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.id).toBe(seed.id);
    expect(response.body.name).toBe(seed.name);
    expect(Array.isArray(response.body.muscles)).toBe(true);
    expect(typeof response.body.description).toBe("string");
    expect(response.body.description.length).toBeGreaterThan(0);
    expect(typeof response.body.instructions).toBe("string");
  });

  it("returns 404 for unknown exercise id", async () => {
    const token = await registerAndLogin("ex.missing@test.com", "exmissing", "123456");
    const response = await request(app)
      .get("/api/exercises/00000000-0000-4000-8000-000000000001")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("EXERCISE_NOT_FOUND");
  });
});
