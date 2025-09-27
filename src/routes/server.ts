import { Elysia, t } from 'elysia'
import * as fs from 'node:fs/promises'
import path from 'node:path'

export const serverRoutes = new Elysia()
  // Keepalive polling
  .post("/p", () => ({ "vMaj": 188, "vMinSrv": 1 }))
  // Tell the server when you switch between VR and desktop mode
  .post("/person/registerusagemode", () => {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  })
  // Register an achievement
  .post("/ach/reg", () => {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  })
  .post("/user/setName", async ({ body }) => {
    const { newName } = body;

    if (!newName || typeof newName !== "string" || newName.length < 3) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid name" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const accountPath = "./data/person/account.json";
    let accountData: Record<string, any> = {};
    try {
      accountData = JSON.parse(await fs.readFile(accountPath, "utf-8"));
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "Account not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    accountData.screenName = newName;
    await fs.writeFile(accountPath, JSON.stringify(accountData, null, 2));

    return new Response(JSON.stringify({ ok: true, screenName: newName }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }, {
    body: t.Object({
      newName: t.String()
    })
  })
  .post(
    "/gift/getreceived",
    ({ body: { userId } }) => Bun.file(path.resolve("./data/person/gift/", userId + ".json")),
    { body: t.Object({ userId: t.String() }) }
  )
  .post("/extras/startedittoolstrial", () => {
    return new Response(JSON.stringify({
      ok: true,
      expiryDate: "3000-04-19T00:07:37.782Z"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  })