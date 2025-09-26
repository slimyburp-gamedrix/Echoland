import { Elysia, t } from 'elysia'
import * as fs from 'node:fs/promises'
import { generateObjectId } from '../utils';
import path from 'node:path';

export const thingRoutes = new Elysia()
  .post("/thing", async ({ body }: any) => {
    const { name = "" } = body;
    const thingId = generateObjectId();
    const filePath = `./data/thing/info/${thingId}.json`;

    // ✅ Load identity from account.json
    let creatorId = "unknown";
    let creatorName = "anonymous";
    try {
      const account = JSON.parse(await fs.readFile("./data/person/account.json", "utf-8"));
      creatorId = account.personId || creatorId;
      creatorName = account.screenName || creatorName;
    } catch (e) {
      console.warn("⚠️ Could not load account.json for object metadata.", e);
    }

    // ✅ Build object with correct identity
    const thingData = {
      id: thingId,
      name,
      creatorId,
      creatorName,
      createdDaysAgo: 0,
      collectedCount: 0,
      placedCount: 1,
      allCreatorsThingsClonable: true,
      isUnlisted: false
    };

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(thingData, null, 2));

    return new Response(JSON.stringify({ id: thingId }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  })
  .post("/thing/rename", async ({ body }) => {
    const { thingId, newName } = body;

    if (!thingId || typeof newName !== "string" || newName.length < 1) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid input" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Update thing/info
    const infoPath = `./data/thing/info/${thingId}.json`;
    let infoData: Record<string, any> = {};
    try {
      infoData = JSON.parse(await fs.readFile(infoPath, "utf-8"));
      const oldName = infoData.name;
      infoData.name = newName;
      await fs.writeFile(infoPath, JSON.stringify(infoData, null, 2));

      // Update thing/def
      const defPath = `./data/thing/def/${thingId}.json`;
      try {
        const defData = JSON.parse(await fs.readFile(defPath, "utf-8"));
        defData.name = newName;
        await fs.writeFile(defPath, JSON.stringify(defData, null, 2));
      } catch { }

      // Update thing/tags
      const tagsPath = `./data/thing/tags/${thingId}.json`;
      try {
        const tagsData = JSON.parse(await fs.readFile(tagsPath, "utf-8"));
        if (Array.isArray(tagsData.tags)) {
          tagsData.tags = tagsData.tags.map((tag: any) => tag === oldName ? newName : tag);
          await fs.writeFile(tagsPath, JSON.stringify(tagsData, null, 2));
        }
      } catch { }

      // Update placements
      const placementRoot = "./data/placement/info";
      const areaDirs = await fs.readdir(placementRoot);
      for (const areaId of areaDirs) {
        const placementDir = path.join(placementRoot, areaId);
        const files = await fs.readdir(placementDir);
        for (const file of files) {
          const placementPath = path.join(placementDir, file);
          try {
            const placement = JSON.parse(await fs.readFile(placementPath, "utf-8"));
            if (placement.Tid === thingId) {
              placement.name = newName;
              await fs.writeFile(placementPath, JSON.stringify(placement, null, 2));
            }
          } catch { }
        }
      }

      return new Response(JSON.stringify({ ok: true, name: newName }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

    } catch {
      return new Response(JSON.stringify({ ok: false, error: "Thing not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
  }, {
    body: t.Object({
      thingId: t.String(),
      newName: t.String()
    })
  })
  // 🔍 Search for things by name or tag
  .post("/thing/search", async ({ body }) => {
    console.log("📥 /thing/search route triggered");

    const searchTerm = typeof body.query === "string" ? body.query.trim().toLowerCase() : "";
    const page = typeof body.page === "number" ? Math.max(0, body.page) : 0;
    const itemsPerPage = 20;

    console.log(`📥 Received query: "${searchTerm}", page: ${page}`);

    const matchedIds: string[] = [];
    const infoDir = "./data/thing/info";
    const tagsDir = "./data/thing/tags";

    try {
      const infoFiles = await fs.readdir(infoDir);

      for (const file of infoFiles) {
        const thingId = path.basename(file, ".json");
        let info: any;

        try {
          const raw = await fs.readFile(path.join(infoDir, file), "utf-8");
          info = JSON.parse(raw);
        } catch {
          continue;
        }

        if (!info || typeof info !== "object") continue;

        const isPlaced = info.placedCount > 0;
        const isUnlisted = info.isUnlisted === true;
        if (!isPlaced || isUnlisted) continue;

        let displayName = typeof info.name === "string" ? info.name.trim().toLowerCase() : "thing";

        const nameMatches = displayName.includes(searchTerm);
        let tagMatches = false;

        if (!nameMatches && searchTerm !== "") {
          try {
            const tagsRaw = await fs.readFile(path.join(tagsDir, `${thingId}.json`), "utf-8");
            const tagData = JSON.parse(tagsRaw);
            const tags = Array.isArray(tagData.tags) ? tagData.tags.map((t: any) => t.toLowerCase()) : [];
            tagMatches = tags.some((tag: any) => tag.includes(searchTerm));
          } catch {
            tagMatches = false;
          }
        }

        const shouldInclude = searchTerm === "" ? true : (nameMatches || tagMatches);
        if (shouldInclude) {
          matchedIds.push(thingId);
        }
      }

      const start = page * itemsPerPage;
      const paginatedIds = matchedIds.slice(start, start + itemsPerPage);

      console.log(`🔎 Total matches: ${matchedIds.length}`);
      console.log(`📦 Returning page ${page} → ${paginatedIds.length} items`);

      return new Response(JSON.stringify({ ids: paginatedIds }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      console.error("❌ Failed to read info directory:", err);
      return new Response(JSON.stringify({ ids: [] }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }, {
    body: t.Object({
      query: t.Optional(t.String()),
      page: t.Optional(t.Number())
    })
  })

  // 📦 Serve thing metadata
  .get("/thing/info/:id", async ({ params }) => {
    const filePath = `./data/thing/info/${params.id}.json`;
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      console.log(`📤 /thing/info/${params.id} → served`);
      return new Response(raw, {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch {
      console.warn(`⚠️ /thing/info/${params.id} → not found`);
      return new Response("{}", { status: 404 });
    }
  })

  // 🧱 Serve thing definition
  .get("/thing/def/:id", async ({ params }) => {
    const filePath = `./data/thing/def/${params.id}.json`;
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      console.log(`📤 /thing/def/${params.id} → served`);
      return new Response(raw, {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch {
      console.warn(`⚠️ /thing/def/${params.id} → not found`);
      return new Response("{}", { status: 404 });
    }
  })
  .post("/thing/fixmissinginfo", async () => {
    const defDir = "./data/thing/def";
    const infoDir = "./data/thing/info";
    const defFiles = await fs.readdir(defDir);
    let createdCount = 0;

    for (const file of defFiles) {
      const thingId = path.basename(file, ".json");
      const infoPath = path.join(infoDir, `${thingId}.json`);

      try {
        const exists = await fs.stat(infoPath).then(() => true).catch(() => false);
        if (exists) continue;

        const def = JSON.parse(await fs.readFile(path.join(defDir, file), "utf-8"));
        const displayName = def.name || def.n || "thing";

        const info = {
          name: displayName,
          creatorId: "system",
          creatorName: "system",
          isUnlisted: false
        };

        await fs.writeFile(infoPath, JSON.stringify(info, null, 2));
        createdCount++;
        console.log(`🆕 Created info for ${thingId}: "${displayName}"`);
      } catch (err) {
        console.error(`❌ Error processing ${file}:`, err);
      }
    }

    return new Response(JSON.stringify({ ok: true, created: createdCount }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  })
  .post("/thing/definition", async ({ body: { id } }) => {
    const filePath = `./data/thing/info/${id}.json`;

    try {
      const data = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(data);
      return new Response(JSON.stringify(parsed.definition), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch {
      return new Response(JSON.stringify({ ok: false }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
  }, {
    body: t.Object({ id: t.String() })
  })
  .post("/thing/definitionAreaBundle", async ({ body: { id } }) => {
    const filePath = `./data/thing/info/${id}.json`;

    try {
      const data = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(data);
      return new Response(JSON.stringify(parsed.definition), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch {
      return new Response(JSON.stringify({ ok: false }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
  }, {
    body: t.Object({ id: t.String() })
  })
  .post("/thing/flagStatus", async ({ body: { id } }) => {
    return new Response(JSON.stringify({ flagged: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }, {
    body: t.Object({ id: t.String() })
  })
  .post("/thing/info", async ({ body: { id } }) => {
    const filePath = `./data/thing/info/${id}.json`;

    try {
      const data = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(data);

      return new Response(JSON.stringify({
        id: parsed.id,
        vertexCount: parsed.vertexCount,
        createdAt: parsed.createdAt
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch {
      return new Response(JSON.stringify({ ok: false }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
  }, {
    body: t.Object({ id: t.String() })
  })
  .post("/thing/updateInfo", async ({ body }) => {
    const { thingId, updates } = body;

    const filePath = `./data/thing/info/${thingId}.json`;
    let thingData: Record<string, any> = {};
    try {
      thingData = JSON.parse(await fs.readFile(filePath, "utf-8"));
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "Thing not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Apply updates safely
    const allowedKeys = ["name", "isUnlisted", "allCreatorsThingsClonable"];
    for (const key of allowedKeys) {
      if (key in updates) {
        thingData[key] = updates[key];
      }
    }

    await fs.writeFile(filePath, JSON.stringify(thingData, null, 2));

    return new Response(JSON.stringify({ ok: true, updated: thingData }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }, {
    body: t.Object({
      thingId: t.String(),
      updates: t.Record(t.String(), t.Any())
    })
  })
  .post("/thing/topCreatedByPerson", async ({ body: { id } }) => {
    const file = Bun.file(`./data/person/topby/${id}.json`);

    if (await file.exists()) {
      const data = await file.json();
      return new Response(JSON.stringify({ ids: data.ids.slice(0, 4) }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } else {
      return new Response(JSON.stringify({ ids: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  }, {
    body: t.Object({ id: t.String() })
  })
  //.get("/thing/info/:thingId",
  //({params: { thingId }}) => Bun.file(path.resolve("./data/thing/info/", thingId + ".json")).json(),
  //)
  .get("/thing/sl/tdef/:thingId",
    ({ params: { thingId } }) => Bun.file(path.resolve("./data/thing/def/", thingId + ".json")).json(),
  )
  .post(
    "/thing/gettags",
    ({ body: { thingId } }) => Bun.file(path.resolve("./data/thing/tags/", thingId + ".json")).json(),
    { body: t.Object({ thingId: t.String() }) }
  )
  .post(
    "/thing/getflag",
    ({ }) => ({ isFlagged: false }),
    { body: t.Object({ id: t.String() }) }
  )
  .post("/thing/topby", async ({ body: { id, limit } }) => {
    const file = Bun.file(`./data/person/topby/${id}.json`);

    if (await file.exists()) {
      const data = await file.json();
      return new Response(JSON.stringify({ ids: data.ids.slice(0, limit || 4) }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } else {
      return new Response(JSON.stringify({ ids: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  }, {
    body: t.Object({
      id: t.String(),
      limit: t.Optional(t.Numeric())
    })
  })