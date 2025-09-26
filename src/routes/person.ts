import { Elysia, t } from 'elysia'
import * as fs from 'node:fs/promises'
import { canned_friendsbystr } from '../canned-data';
import path from 'node:path';

export const personRoutes = new Elysia()
  // Save avatar body attachments to account.json
  .post("/person/updateattachment", async ({ body }) => {
    const { id, data, attachments } = body as any;

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

    // Ensure attachments object exists in account
    let currentAttachments: Record<string, any> = {};
    if (typeof accountData.attachments === "string") {
      try { currentAttachments = JSON.parse(accountData.attachments) ?? {}; } catch { currentAttachments = {}; }
    } else if (accountData.attachments && typeof accountData.attachments === "object") {
      currentAttachments = accountData.attachments as Record<string, any>;
    }

    if (attachments !== undefined) {
      // Full replacement path
      let parsed: unknown = attachments;
      if (typeof attachments === "string") {
        try { parsed = JSON.parse(attachments); } catch {
          return new Response(JSON.stringify({ ok: false, error: "attachments must be JSON or JSON string" }), {
            status: 422,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
      accountData.attachments = parsed;
    } else if (id !== undefined && data !== undefined) {
      // Incremental update path: single slot
      let parsedData: any = data;
      if (typeof data === "string") {
        try { parsedData = JSON.parse(data); } catch {
          return new Response(JSON.stringify({ ok: false, error: "data must be JSON string" }), {
            status: 422,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
      currentAttachments[String(id)] = parsedData;
      accountData.attachments = currentAttachments;
    } else {
      return new Response(JSON.stringify({ ok: false, error: "Missing attachments or (id,data)" }), {
        status: 422,
        headers: { "Content-Type": "application/json" }
      });
    }

    await fs.writeFile(accountPath, JSON.stringify(accountData, null, 2));

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }, {
    body: t.Union([
      t.Object({
        attachments: t.Union([t.String(), t.Record(t.String(), t.Any())])
      }),
      t.Object({ id: t.Union([t.String(), t.Number()]), data: t.String() })
    ])
  })
  .get("person/friendsbystr",
    () => canned_friendsbystr
  )


  .post("person/info",
    async ({ body: { areaId, userId } }) => {
      const file = Bun.file(path.resolve("./data/person/info/", userId + ".json"))

      if (await file.exists()) {
        return await file.json()
      }
      else {
        return { "isFriend": false, "isEditorHere": false, "isListEditorHere": false, "isOwnerHere": false, "isAreaLocked": false, "isOnline": false }
      }
    },
    { body: t.Object({ areaId: t.String(), userId: t.String() }) }
  )
  .post("/person/infobasic",
    async ({ body: { areaId, userId } }) => {
      return { "isEditorHere": false }
    },
    { body: t.Object({ areaId: t.String(), userId: t.String() }) }
  )
  .post("/person/updatesetting", async ({ body }) => {
    const { name, value } = body;

    const accountPath = "./data/person/account.json";
    let accountData: { personId?: string };
    try {
      accountData = JSON.parse(await fs.readFile(accountPath, "utf-8"));
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "Account not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    const personId = accountData.personId;
    if (!personId) {
      return new Response(JSON.stringify({ ok: false, error: "personId not found in account" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const infoPath = `./data/person/info/${personId}.json`;
    let personData: Record<string, any> = {};
    try {
      personData = JSON.parse(await fs.readFile(infoPath, "utf-8"));
    } catch (e) {
      // Let's create it if it doesn't exist.
      // return new Response(JSON.stringify({ ok: false, error: "Person not found" }), {
      //   status: 404,
      //   headers: { "Content-Type": "application/json" }
      // });
    }

    const validSettings = ['screenName', 'statusText', 'isFindable'];
    if (validSettings.includes(name)) {
      personData[name] = value;
    } else {
      return new Response(JSON.stringify({ ok: false, error: "Invalid setting name" }), {
        status: 422,
        headers: { "Content-Type": "application/json" }
      });
    }

    await fs.writeFile(infoPath, JSON.stringify(personData, null, 2));

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }, {
    body: t.Object({
      name: t.String(),
      value: t.Any()
    })
  })

