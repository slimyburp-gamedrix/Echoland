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


