import { Elysia } from 'elysia'
import path from 'node:path'
import { canned_forums_favorites } from '../canned-data'

export const forumRoutes = new Elysia()
  .get("/forum/favorites",
    () => {
      return canned_forums_favorites
    }
  )
  .get("/forum/forum/:id", ({ params: { id } }) => Bun.file(path.resolve("./data/forum/forum/", id + ".json")).json())
  .get("/forum/thread/:id", ({ params: { id } }) => Bun.file(path.resolve("./data/forum/thread/", id + ".json")).json())
  .post("/forum/comment/like", async ({ request }) => {
    let payload: any
    payload = await request.json()

    const threadId = typeof payload?.threadId === "string" ? payload.threadId.trim() : ""
    const commentUserId = typeof payload?.commentUserId === "string" ? payload.commentUserId.trim() : ""
    const commentDate = typeof payload?.commentDate === "string" ? payload.commentDate.trim() : ""


    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  })


