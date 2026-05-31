import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../app.js";
import { DEFAULT_EXERCISE_SEED } from "../data/defaultExercises.js";
import { store } from "../services/store.js";

async function registerAndLogin(email: string, username: string, password: string) {
  await request(app).post("/api/auth/register").send({ email, username, password }).expect(201);
  const login = await request(app).post("/api/auth/login").send({ email, password }).expect(200);
  return login.body.token as string;
}

describe("posts security flow", () => {
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

  it("lists post likes for authorized viewers", async () => {
    const ownerToken = await registerAndLogin("owner.likeslist@test.com", "ownerlikes", "123456");
    const fanToken = await registerAndLogin("fan.likeslist@test.com", "fanlikes", "123456");
    const created = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ content: "Post con likes", workoutId: null })
      .expect(201);

    await request(app)
      .post(`/api/posts/${created.body.id}/likes`)
      .set("Authorization", `Bearer ${fanToken}`)
      .expect(200);

    const list = await request(app)
      .get(`/api/posts/${created.body.id}/likes`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);

    expect(list.body.total).toBe(1);
    expect(list.body.likes).toHaveLength(1);
    expect(list.body.likes[0].username).toBe("fanlikes");
    expect(list.body.likes[0].likedAt).toBeTruthy();
  });

  it("rejects listing likes without token", async () => {
    const ownerToken = await registerAndLogin("owner.likes401@test.com", "ownerlikes401", "123456");
    const created = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ content: "Post privado likes", workoutId: null })
      .expect(201);

    const response = await request(app).get(`/api/posts/${created.body.id}/likes`);
    expect(response.status).toBe(401);
    expect(response.body.code).toBe("AUTH_HEADER_INVALID");
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

  it("updates an owned post content and visibility", async () => {
    const ownerToken = await registerAndLogin("owner.edit@test.com", "owneredit", "123456");
    const created = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ content: "texto original", visibility: "public", workoutId: null })
      .expect(201);

    const updated = await request(app)
      .put(`/api/posts/${created.body.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ content: "texto editado", visibility: "followers" })
      .expect(200);

    expect(updated.body.content).toBe("texto editado");
    expect(updated.body.visibility).toBe("followers");
    expect(updated.body.updatedAt).not.toBe(created.body.updatedAt);
  });

  it("prevents editing post owned by another user", async () => {
    const ownerToken = await registerAndLogin("owner.edit2@test.com", "owneredit2", "123456");
    const intruderToken = await registerAndLogin("intruder.edit2@test.com", "intruderedit2", "123456");
    const created = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ content: "post privado", visibility: "private", workoutId: null })
      .expect(201);

    const response = await request(app)
      .put(`/api/posts/${created.body.id}`)
      .set("Authorization", `Bearer ${intruderToken}`)
      .send({ content: "hack", visibility: "public" });
    expect(response.status).toBe(403);
    expect(response.body.code).toBe("POST_FORBIDDEN");
  });

  it("filters posts by visibility", async () => {
    const ownerToken = await registerAndLogin("owner.visibility@test.com", "ownervis", "123456");
    const followerToken = await registerAndLogin("follower.visibility@test.com", "followervis", "123456");
    const strangerToken = await registerAndLogin("stranger.visibility@test.com", "strangervis", "123456");

    const ownerUser = store.users.find((u) => u.email === "owner.visibility@test.com");
    const followerUser = store.users.find((u) => u.email === "follower.visibility@test.com");
    if (!ownerUser || !followerUser) throw new Error("setup users missing");
    store.follows.push({
      id: "follow-visibility",
      followerId: followerUser.id,
      followingId: ownerUser.id,
      createdAt: new Date().toISOString(),
    });

    await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ content: "public post", visibility: "public", workoutId: null })
      .expect(201);
    await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ content: "followers post", visibility: "followers", workoutId: null })
      .expect(201);
    await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ content: "private post", visibility: "private", workoutId: null })
      .expect(201);

    const ownerList = await request(app).get("/api/posts").set("Authorization", `Bearer ${ownerToken}`).expect(200);
    const followerList = await request(app)
      .get("/api/posts")
      .set("Authorization", `Bearer ${followerToken}`)
      .expect(200);
    const strangerList = await request(app)
      .get("/api/posts")
      .set("Authorization", `Bearer ${strangerToken}`)
      .expect(200);

    expect(ownerList.body.length).toBe(3);
    expect(followerList.body.length).toBe(2);
    expect(strangerList.body.length).toBe(1);
  });

  it("returns notifications for likes/comments/follows", async () => {
    const ownerToken = await registerAndLogin("owner.notif@test.com", "ownernotif", "123456");
    const actorToken = await registerAndLogin("actor.notif@test.com", "actornotif", "123456");

    const ownerPost = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ content: "post con notificaciones", workoutId: null })
      .expect(201);

    await request(app).post(`/api/posts/${ownerPost.body.id}/likes`).set("Authorization", `Bearer ${actorToken}`).expect(200);
    await request(app)
      .post(`/api/posts/${ownerPost.body.id}/comments`)
      .set("Authorization", `Bearer ${actorToken}`)
      .send({ content: "buen post" })
      .expect(201);

    const ownerUser = store.users.find((u) => u.email === "owner.notif@test.com");
    const actorUser = store.users.find((u) => u.email === "actor.notif@test.com");
    if (!ownerUser || !actorUser) throw new Error("setup users missing");
    store.follows.push({
      id: "follow-notif",
      followerId: actorUser.id,
      followingId: ownerUser.id,
      createdAt: new Date().toISOString(),
    });

    const notif = await request(app)
      .get("/api/posts/notifications")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);

    expect(Array.isArray(notif.body.notifications)).toBe(true);
    expect(notif.body.notifications.length).toBeGreaterThanOrEqual(3);
    const types = notif.body.notifications.map((n: { type: string }) => n.type);
    expect(types).toContain("like");
    expect(types).toContain("comment");
    expect(types).toContain("follow");
    expect(typeof notif.body.unreadCount).toBe("number");
    expect(notif.body.unreadCount).toBe(notif.body.notifications.filter((n: { read?: boolean }) => !n.read).length);
    for (const n of notif.body.notifications) {
      expect(typeof n.read).toBe("boolean");
    }
  });

  it("marks notifications read and lowers unreadCount", async () => {
    const ownerToken = await registerAndLogin("owner.readnotif@test.com", "ownerreadnf", "123456");
    const actorToken = await registerAndLogin("actor.readnotif@test.com", "actorreadnf", "123456");

    const ownerPost = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ content: "para leidas", workoutId: null })
      .expect(201);

    await request(app)
      .post(`/api/posts/${ownerPost.body.id}/likes`)
      .set("Authorization", `Bearer ${actorToken}`)
      .expect(200);

    const listed = await request(app)
      .get("/api/posts/notifications")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);
    const likeNotif = listed.body.notifications.find((n: { type: string }) => n.type === "like") as {
      id: string;
      read?: boolean;
    };
    expect(likeNotif).toBeTruthy();
    expect(likeNotif.read).toBe(false);

    const mark = await request(app)
      .post("/api/posts/notifications/read")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ keys: [likeNotif.id] })
      .expect(200);
    expect(mark.body.marked).toBeGreaterThanOrEqual(1);

    const after = await request(app).get("/api/posts/notifications").set("Authorization", `Bearer ${ownerToken}`).expect(200);
    const reads = after.body.notifications.filter((n: { id: string; read?: boolean }) => n.id === likeNotif.id).map(
      (n: { read: boolean }) => n.read,
    );
    expect(reads).toContain(true);
    expect(after.body.unreadCount).toBeLessThanOrEqual(listed.body.unreadCount);
  });

  it("lists another user's posts with visibility rules", async () => {
    const ownerToken = await registerAndLogin("owner.byuser@test.com", "ownerbyuser", "123456");
    const followerToken = await registerAndLogin("follower.byuser@test.com", "folbyuser", "123456");
    const strangerToken = await registerAndLogin("stranger.byuser@test.com", "strbyuser", "123456");

    const ownerUser = store.users.find((u) => u.email === "owner.byuser@test.com");
    const followerUser = store.users.find((u) => u.email === "follower.byuser@test.com");
    if (!ownerUser || !followerUser) throw new Error("setup users missing");
    store.follows.push({
      id: "follow-byuser",
      followerId: followerUser.id,
      followingId: ownerUser.id,
      createdAt: new Date().toISOString(),
    });

    await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ content: "public by user", visibility: "public", workoutId: null })
      .expect(201);
    await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ content: "followers by user", visibility: "followers", workoutId: null })
      .expect(201);

    const followerList = await request(app)
      .get(`/api/posts/by-user/${ownerUser.id}`)
      .set("Authorization", `Bearer ${followerToken}`)
      .expect(200);
    expect(followerList.body.length).toBe(2);

    const strangerList = await request(app)
      .get(`/api/posts/by-user/${ownerUser.id}`)
      .set("Authorization", `Bearer ${strangerToken}`)
      .expect(200);
    expect(strangerList.body.length).toBe(1);
    expect(strangerList.body[0].content).toBe("public by user");
  });

  it("paginates by-user posts when limit query is set", async () => {
    const token = await registerAndLogin("page.owner@test.com", "pageowner", "123456");
    const user = store.users.find((u) => u.email === "page.owner@test.com");
    if (!user) throw new Error("missing user");

    for (let i = 0; i < 3; i++) {
      await request(app)
        .post("/api/posts")
        .set("Authorization", `Bearer ${token}`)
        .send({
          content: `post num ${i + 1}`,
          workoutId: null,
          visibility: "public",
        })
        .expect(201);
    }

    const p1 = await request(app)
      .get(`/api/posts/by-user/${user.id}?limit=2`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(p1.body.posts)).toBe(true);
    expect(p1.body.posts.length).toBe(2);
    expect(p1.body.total).toBe(3);
    expect(p1.body.nextCursor).toBeTruthy();

    const p2 = await request(app)
      .get(`/api/posts/by-user/${user.id}`)
      .query({ limit: "2", cursor: p1.body.nextCursor })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(p2.body.posts.length).toBe(1);
    expect(p2.body.nextCursor).toBeNull();
    expect(p2.body.total).toBe(3);
  });

  it("returns 404 for by-user when user does not exist", async () => {
    const token = await registerAndLogin("solo.byuser@test.com", "solobyuser", "123456");
    const response = await request(app).get("/api/posts/by-user/nope-nope-id").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(404);
  });

  const ONE_PX_PNG =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  it("creates photo-only post with tiny png data url", async () => {
    const token = await registerAndLogin("photo.only@test.com", "photoonly", "123456");
    const created = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        content: "",
        workoutId: null,
        visibility: "public",
        media: [{ type: "image", url: ONE_PX_PNG }],
      })
      .expect(201);
    expect(Array.isArray(created.body.media)).toBe(true);
    expect(created.body.media.length).toBe(1);
  });

  it("rejects unsupported image data url (e.g. gif)", async () => {
    const token = await registerAndLogin("bad.media@test.com", "badmedia", "123456");
    const response = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        content: "aaaa",
        workoutId: null,
        visibility: "public",
        media: [{ type: "image", url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" }],
      });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("POST_MEDIA_INVALID");
  });

  it("clears attachments when updating with empty media array", async () => {
    const token = await registerAndLogin("media.clear@test.com", "mediaclear", "123456");
    const created = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        content: "",
        workoutId: null,
        visibility: "public",
        media: [{ type: "image", url: ONE_PX_PNG }],
      })
      .expect(201);
    expect(created.body.media?.length).toBe(1);

    const cleared = await request(app)
      .put(`/api/posts/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "texto nuevo cuatro", visibility: "public", media: [] })
      .expect(200);
    expect(cleared.body.media ?? []).toHaveLength(0);
  });
});

