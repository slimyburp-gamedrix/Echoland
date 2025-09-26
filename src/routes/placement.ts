import { Elysia, t } from 'elysia'
import * as fs from 'node:fs/promises'
import path from 'node:path';

export const placementRoutes = new Elysia()
  .post('/placement/list', async ({ body: { areaId } }: any) =>
    placementRoutes.routes.find(r => r.path === '/placement/info')!
      .handler({ body: { areaId, placementId: '' } } as any)
  )
  .post('/placement/metadata', async ({ body: { areaId, placementId } }: any) =>
    placementRoutes.routes.find(r => r.path === '/placement/info')!
      .handler({ body: { areaId, placementId } } as any)
  )
  .post("/placement/new", async ({ body }) => {
    const { areaId, placement } = body;
    const parsed = JSON.parse(decodeURIComponent(placement));
    const placementId = parsed.Id;
    const placementPath = `./data/placement/info/${areaId}/${placementId}.json`;

    // Inject identity from account.json
    try {
      const account = JSON.parse(await fs.readFile("./data/person/account.json", "utf-8"));
      parsed.placerId = account.personId || "unknown";
      parsed.placerName = account.screenName || "anonymous";
    } catch {
      parsed.placerId = "unknown";
      parsed.placerName = "anonymous";
    }

    parsed.placedDaysAgo = 0;

    await fs.mkdir(`./data/placement/info/${areaId}`, { recursive: true });
    await Bun.write(placementPath, JSON.stringify(parsed, null, 2));

    const areaFilePath = `./data/area/load/${areaId}.json`;
    let areaData: Record<string, any> = {};
    try {
      areaData = JSON.parse(await fs.readFile(areaFilePath, "utf-8"));
    } catch {
      areaData = { areaId, placements: [] };
    }

    if (!Array.isArray(areaData.placements)) areaData.placements = [];

    areaData.placements = areaData.placements.filter((p: any) => p.Id !== placementId);
    areaData.placements.push(parsed);

    await fs.writeFile(areaFilePath, JSON.stringify(areaData, null, 2));

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }, {
    body: t.Object({
      areaId: t.String(),
      placement: t.String()
    })
  })
  .post("/placement/info", async ({ body: { areaId, placementId } }) => {
    const filePath = `./data/placement/info/${areaId}/${placementId}.json`;

    try {
      const data = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(data);

      const metadata = {
        placerId: parsed.placerId || "unknown",
        placerName: parsed.placerName || "anonymous",
        placedDaysAgo: parsed.placedDaysAgo || 0
      };

      return new Response(JSON.stringify(metadata), {
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
    body: t.Object({
      areaId: t.String(),
      placementId: t.String()
    })
  })
  .post("/placement/save", async ({ body: { areaId, placementId, data } }: any) => {
    if (!areaId || !placementId || !data) {
      console.error("Missing required placement fields");
      return { ok: false, error: "Invalid placement data" };
    }

    try {
      const account = JSON.parse(await fs.readFile("./data/person/account.json", "utf-8"));
      data.placerId = account.personId || "unknown";
      data.placerName = account.screenName || "anonymous";
    } catch {
      data.placerId = "unknown";
      data.placerName = "anonymous";
    }

    const dirPath = path.resolve("./data/placement/info/", areaId);
    await fs.mkdir(dirPath, { recursive: true });

    const filePath = path.join(dirPath, placementId + ".json");
    await Bun.write(filePath, JSON.stringify(data));

    return { ok: true };
  }, {
    body: t.Object({
      areaId: t.String(),
      placementId: t.String(),
      data: t.Unknown()
    })
  })
  .post("/placement/delete", async ({ body: { areaId, placementId } }) => {
    const placementPath = `./data/placement/info/${areaId}/${placementId}.json`;

    // Remove the placement file
    try {
      await fs.rm(placementPath);
    } catch { }

    // Remove from area file's placements array
    const areaFilePath = `./data/area/load/${areaId}.json`;
    let areaData: Record<string, any> = {};
    try {
      areaData = JSON.parse(await fs.readFile(areaFilePath, "utf-8"));
    } catch {
      areaData = { areaId, placements: [] };
    }

    if (!Array.isArray(areaData.placements)) areaData.placements = [];

    // Remove the placement with this Id
    areaData.placements = areaData.placements.filter(
      (p: any) => p.Id !== placementId
    );

    await fs.writeFile(areaFilePath, JSON.stringify(areaData, null, 2));

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }, {
    body: t.Object({
      areaId: t.String(),
      placementId: t.String()
    })
  })
  .post("/placement/update", async ({ body }) => {
    const { areaId, placement } = body;
    const parsed = JSON.parse(decodeURIComponent(placement));
    const placementId = parsed.Id;
    const placementPath = `./data/placement/info/${areaId}/${placementId}.json`;

    try {
      const account = JSON.parse(await fs.readFile("./data/person/account.json", "utf-8"));
      parsed.placerId = account.personId || "unknown";
      parsed.placerName = account.screenName || "anonymous";
    } catch {
      parsed.placerId = "unknown";
      parsed.placerName = "anonymous";
    }

    await Bun.write(placementPath, JSON.stringify(parsed, null, 2));

    const areaFilePath = `./data/area/load/${areaId}.json`;
    let areaData: Record<string, any> = {};
    try {
      areaData = JSON.parse(await fs.readFile(areaFilePath, "utf-8"));
    } catch {
      areaData = { areaId, placements: [] };
    }

    if (!Array.isArray(areaData.placements)) areaData.placements = [];
    areaData.placements = areaData.placements.filter((p: any) => p.Id !== placementId);
    areaData.placements.push(parsed);

    await fs.writeFile(areaFilePath, JSON.stringify(areaData, null, 2));

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }, {
    body: t.Object({
      areaId: t.String(),
      placement: t.String()
    })
  })
  .post("/placement/duplicate", async ({ body }) => {
    const { areaId, placements } = body;

    const areaFilePath = `./data/area/load/${areaId}.json`;
    let areaData: Record<string, any> = {};
    try {
      areaData = JSON.parse(await fs.readFile(areaFilePath, "utf-8"));
    } catch {
      areaData = { areaId, placements: [] };
    }

    if (!Array.isArray(areaData.placements)) areaData.placements = [];

    let personId = "unknown";
    let screenName = "anonymous";
    try {
      const account = JSON.parse(await fs.readFile("./data/person/account.json", "utf-8"));
      personId = account.personId || personId;
      screenName = account.screenName || screenName;
    } catch { }

    const newPlacements = placements.map((encoded: string) => {
      const parsed = JSON.parse(decodeURIComponent(encoded));
      return {
        Id: parsed.Id,
        Tid: parsed.Tid,
        P: parsed.P,
        R: parsed.R,
        S: parsed.S || { x: 1, y: 1, z: 1 },
        A: parsed.A || [],
        D: parsed.D || {},
        placerId: personId,
        placerName: screenName,
        placedDaysAgo: 0
      };
    });

    for (const placement of newPlacements) {
      const placementPath = `./data/placement/info/${areaId}/${placement.Id}.json`;
      await fs.mkdir(`./data/placement/info/${areaId}`, { recursive: true });
      await Bun.write(placementPath, JSON.stringify(placement, null, 2));
    }

    const existingIds = new Set(areaData.placements.map((p: any) => p.Id));
    for (const placement of newPlacements) {
      if (!existingIds.has(placement.Id)) {
        areaData.placements.push(placement);
      }
    }

    await fs.writeFile(areaFilePath, JSON.stringify(areaData, null, 2));

    return new Response(JSON.stringify({ ok: true, count: newPlacements.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }, {
    body: t.Object({
      areaId: t.String(),
      placements: t.Array(t.String())
    })
  })