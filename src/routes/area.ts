import { Elysia, t } from 'elysia'
import path from 'node:path'
import * as fs from 'node:fs/promises'
import { canned_areaList } from '../canned-data'
import {
  addAreaToIndex,
  findAreaByUrlName,
  generateObjectId,
  getDynamicAreaList,
  updateAreaList,
  searchArea,
} from '../utils'


export const areaRoutes = new Elysia()
  .post(
    "/area/load",
    async ({ body: { areaId, areaUrlName } }) => {
      if (areaId) {
        const file = Bun.file(path.resolve("./data/area/load/", areaId + ".json"))
        if (await file.exists()) {
          const areaData = await file.json();
          return {
            ...areaData,
            forceEditMode: true,
            requestorIsEditor: true,
            requestorIsListEditor: true,
            requestorIsOwner: true,
            hasEditTools: true,
            hasEditToolsPermanently: true,
            editToolsExpiryDate: null,
            isInEditToolsTrial: false,
            wasEditToolsTrialEverActivated: false
          };

        } else {
          console.error("couldn't find area", areaId, "on disk?")
          return Response.json({ "ok": false, "_reasonDenied": "Private", "serveTime": 13 }, { status: 200 })
        }
      }
      else if (areaUrlName) {
        const areaId = findAreaByUrlName(areaUrlName)
        console.log("client asked to load", areaUrlName, " - found", areaId);

        if (areaId) {
          console.error("couldn't find area", areaUrlName, "in our index?")
          return await Bun.file(path.resolve("./data/area/load/" + areaId + ".json")).json()
        }
        else {
          return Response.json({ "ok": false, "_reasonDenied": "Private", "serveTime": 13 }, { status: 200 })
        }
      }

      console.error("client asked for neither an areaId or an areaUrlName?")
      // Yeah that seems to be the default response, and yeah it returns a 200 OK
      return Response.json({ "ok": false, "_reasonDenied": "Private", "serveTime": 13 }, { status: 200 })
    },
    { body: t.Object({ areaId: t.Optional(t.String()), areaUrlName: t.Optional(t.String()), isPrivate: t.String() }) }
  )
  .post(
    "/area/info",
    ({ body: { areaId } }) => Bun.file(path.resolve("./data/area/info/", areaId + ".json")).json(),
    { body: t.Object({ areaId: t.String() }) }
  )
  .post("/area/save",
    async ({ body }) => {
      const areaId = body.id || generateObjectId();
      const filePath = `./data/area/load/${areaId}.json`;

      await fs.mkdir("./data/area/load", { recursive: true });
      // Align creator identity with account.json (same as /area route)
      let creatorId = body.creatorId;
      try {
        const account = JSON.parse(await fs.readFile("./data/person/account.json", "utf-8"));
        if (account?.personId) creatorId = account.personId;
      } catch { }
      const sanitizedBody = {
        ...body,
        creatorId
      };

      await Bun.write(filePath, JSON.stringify(sanitizedBody));



      await addAreaToIndex({
        id: areaId,
        name: body.name,
        description: body.description || "",
      });
      await Bun.write("./cache/areaIndex.json", JSON.stringify(areaIndex));

      return { ok: true, id: areaId };
    },
    { body: t.Unknown() }
  )
  .post(
    "/area/getsubareas",
    async ({ body: { areaId } }) => {
      const file = Bun.file(path.resolve("./data/area/subareas/", areaId + ".json"))
      if (await file.exists()) {
        return await file.json()
      }
      else {
        return { subAreas: [] }
      }
    },
    { body: t.Object({ areaId: t.String() }) }
  )
  .post(
    "/area/search",
    async ({ body: { term, byCreatorId } }) => {
      if (byCreatorId) {
        const file = Bun.file(path.resolve("./data/person/areasearch/", byCreatorId + ".json"))

        if (await file.exists()) {
          return await file.json()
        }
        else {
          return { areas: [], ownPrivateAreas: [] }
        }
      }
      else {
        const matchingAreas = searchArea(term);

        return {
          areas: matchingAreas,
          ownPrivateAreas: []
        }
      }

    },
    { body: t.Object({ term: t.String(), byCreatorId: t.Optional(t.String()) }) }
  )
  .post("/area/lists", async () => {
    const dynamic = await getDynamicAreaList();

    return {
      visited: [...canned_areaList.visited, ...dynamic.visited],
      created: [...canned_areaList.created, ...dynamic.created],
      newest: [...canned_areaList.newest, ...dynamic.newest],
      popular: [...canned_areaList.popular, ...dynamic.popular],
      popular_rnd: [...canned_areaList.popular_rnd, ...dynamic.popular_rnd],
      popularNew: [...canned_areaList.popularNew, ...dynamic.popularNew],
      popularNew_rnd: [...canned_areaList.popularNew_rnd, ...dynamic.popularNew_rnd],
      lively: [...canned_areaList.lively, ...dynamic.lively],
      favorite: [...canned_areaList.favorite, ...dynamic.favorite],
      mostFavorited: [...canned_areaList.mostFavorited, ...dynamic.mostFavorited],
      totalOnline: canned_areaList.totalOnline + dynamic.totalOnline,
      totalAreas: canned_areaList.totalAreas + dynamic.totalAreas,
      totalPublicAreas: canned_areaList.totalPublicAreas + dynamic.totalPublicAreas,
      totalSearchablePublicAreas: canned_areaList.totalSearchablePublicAreas + dynamic.totalSearchablePublicAreas
    };
  })
  .get("/repair-home-area", async () => {
    const accountPath = "./data/person/account.json";
    const areaBase = "./data/area";

    try {
      const account = JSON.parse(await fs.readFile(accountPath, "utf-8"));
      const homeId = account.homeAreaId;
      if (!homeId) return new Response("No homeAreaId found", { status: 400 });

      const loadPath = `${areaBase}/load/${homeId}.json`;
      const bundlePath = `${areaBase}/bundle/${homeId}`;

      // ✅ Load area
      const loadFile = Bun.file(loadPath);
      if (!(await loadFile.exists())) {
        return new Response("Home area load file missing", { status: 404 });
      }

      const loadData = await loadFile.json();
      let areaKey = loadData.areaKey;

      // ✅ Check if bundle file exists
      const bundleFilePath = `${bundlePath}/${areaKey}.json`;
      const bundleFile = Bun.file(bundleFilePath);
      const bundleExists = await bundleFile.exists();

      // ✅ If bundle missing or key malformed, regenerate
      const isMalformed = !areaKey.startsWith("rr") || areaKey.length !== 26;
      if (!bundleExists || isMalformed) {
        const newKey = `rr${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
        const newBundlePath = `${bundlePath}/${newKey}.json`;

        await fs.mkdir(bundlePath, { recursive: true });
        await fs.writeFile(newBundlePath, JSON.stringify({
          thingDefinitions: [],
          serveTime: 0
        }, null, 2));

        loadData.areaKey = newKey;
        await fs.writeFile(loadPath, JSON.stringify(loadData, null, 2));

        return new Response(`✅ Repaired home area with new key: ${newKey}`, { status: 200 });
      }

      return new Response("✅ Home area is already valid", { status: 200 });
    } catch (err) {
      console.error("Repair failed:", err);
      return new Response("Server error during repair", { status: 500 });
    }
  })
  .post("/area", async ({ body }) => {
    const areaName = body?.name;
    if (!areaName || typeof areaName !== "string") {
      return new Response("Missing area name", { status: 400 });
    }

    // ✅ Load identity from account.json
    let personId: string;
    let personName: string;

    try {
      const account = JSON.parse(await fs.readFile("./data/person/account.json", "utf-8"));
      personId = account.personId;
      personName = account.screenName;

      if (!personId || !personName) {
        throw new Error("Missing personId or screenName in account.json");
      }
    } catch {
      return new Response("Could not load valid account identity", { status: 500 });
    }

    const generateId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 24);
    const areaId = generateId();
    const bundleKey = `rr${generateId()}`;
    const basePath = "./data/area";
    const timestamp = new Date().toISOString();

    await Promise.all([
      fs.mkdir(`${basePath}/info`, { recursive: true }),
      fs.mkdir(`${basePath}/bundle/${areaId}`, { recursive: true }),
      fs.mkdir(`${basePath}/load`, { recursive: true }),
      fs.mkdir(`${basePath}/subareas`, { recursive: true })
    ]);

    const groundPlacement = {
      Id: generateId(),
      Tid: "000000000000000000000001",
      P: { x: 0, y: -0.3, z: 0 },
      R: { x: 0, y: 0, z: 0 }
    };

    // ✅ Write info file
    await fs.writeFile(`${basePath}/info/${areaId}.json`, JSON.stringify({
      editors: [{ id: personId, name: personName, isOwner: true }],
      listEditors: [],
      copiedFromAreas: [],
      name: areaName,
      creationDate: timestamp,
      totalVisitors: 0,
      isZeroGravity: false,
      hasFloatingDust: false,
      isCopyable: false,
      onlyOwnerSetsLocks: false,
      isExcluded: false,
      renameCount: 0,
      copiedCount: 0,
      isFavorited: false
    }, null, 2));

    // ✅ Write bundle file
    await fs.writeFile(`${basePath}/bundle/${areaId}/${bundleKey}.json`, JSON.stringify({
      thingDefinitions: [],
      serveTime: 0
    }, null, 2));

    // ✅ Write load file with embedded settings
    await fs.writeFile(`${basePath}/load/${areaId}.json`, JSON.stringify({
      ok: true,
      areaId,
      areaName,
      areaKey: bundleKey,
      areaCreatorId: personId,
      isPrivate: false,
      isZeroGravity: false,
      hasFloatingDust: false,
      isCopyable: false,
      onlyOwnerSetsLocks: false,
      isExcluded: false,
      environmentChangersJSON: JSON.stringify({ environmentChangers: [] }),
      requestorIsEditor: true,
      requestorIsListEditor: true,
      requestorIsOwner: true,
      placements: [groundPlacement],
      serveTime: 0,
      sound: { enabled: true, volume: 1.0 },
      gravity: { enabled: true, strength: 9.8 },
      lighting: { enabled: true },
      interactions: { enabled: true },
      settings: {
        allowVisitors: true,
        allowEdits: true,
        allowCopying: false,
        allowLocking: true
      },
      environment: {
        skybox: "default",
        ambientLight: 1.0,
        fog: { enabled: false }
      },
      locks: {
        lockedObjects: [],
        lockRules: []
      }
    }, null, 2));

    // ✅ Write subareas file
    await fs.writeFile(`${basePath}/subareas/${areaId}.json`, JSON.stringify({ subAreas: [] }, null, 2));

    // ✅ Update areaindex.json
    const indexPath = "./cache/areaindex.json";
    let currentIndex: any[] = [];
    try {
      const indexFile = Bun.file(indexPath);
      if (await indexFile.exists()) {
        const parsed = await indexFile.json();
        if (Array.isArray(parsed)) currentIndex = parsed;
      }
    } catch {
      console.warn("Couldn't read areaindex.json from cache.");
    }

    currentIndex.push({
      id: areaId,
      name: areaName,
      creatorId: personId,
      createdAt: timestamp
    });

    await fs.writeFile(indexPath, JSON.stringify(currentIndex, null, 2));

    // ✅ Update arealist.json (prevent duplicates)
    await updateAreaList({ id: areaId, name: areaName });

    // ✅ Inject area into account.json under ownedAreas
    const accountPath = "./data/person/account.json";
    try {
      const accountFile = Bun.file(accountPath);
      let accountData = await accountFile.json();

      accountData.ownedAreas = [...new Set([...(accountData.ownedAreas ?? []), areaId])];

      await fs.writeFile(accountPath, JSON.stringify(accountData, null, 2));
    } catch {
      console.warn("⚠️ Could not update account.json with new owned area.");
    }

    return new Response(JSON.stringify({ id: areaId }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }, {
    body: t.Object({ name: t.String() }),
    type: "form"
  })
  .post("/area/updatesettings", async ({ body }) => {
    const { areaId, environmentChanger } = body;

    if (!areaId || typeof areaId !== "string") {
      return new Response("Missing areaId", { status: 400 });
    }

    const loadPath = `./data/area/load/${areaId}.json`;
    try {
      const loadFile = Bun.file(loadPath);
      if (!await loadFile.exists()) {
        return new Response("Area not found", { status: 404 });
      }

      const areaData = await loadFile.json();

      // Update environmentChangersJSON if provided
      if (environmentChanger) {
        try {
          const newChanger = JSON.parse(environmentChanger);
          const currentChangers = JSON.parse(areaData.environmentChangersJSON || '{"environmentChangers":[]}');

          // Add or update the environment changer
          const existingIndex = currentChangers.environmentChangers.findIndex((c: any) => c.Name === newChanger.Name);
          if (existingIndex >= 0) {
            currentChangers.environmentChangers[existingIndex] = newChanger;
          } else {
            currentChangers.environmentChangers.push(newChanger);
          }

          areaData.environmentChangersJSON = JSON.stringify(currentChangers);
        } catch (parseError) {
          console.error("Error parsing environmentChanger JSON:", parseError);
          return new Response("Invalid environmentChanger JSON", { status: 400 });
        }
      }

      // Write updated data back
      await Bun.write(loadPath, JSON.stringify(areaData, null, 2));

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error updating area settings:", error);
      return new Response("Server error", { status: 500 });
    }
  }, {
    body: t.Object({
      areaId: t.String(),
      environmentChanger: t.Optional(t.String())
    })
  })
  .post("/area/visit", async ({ body }) => {
    const { areaId, name } = body;
    if (!areaId || !name) return new Response("Missing data", { status: 400 });

    const listPath = "/app/data/area/arealist.json";
    const areaList = await getDynamicAreaList();
    const alreadyVisited = areaList.visited.some(a => a.id === areaId);

    if (!alreadyVisited) {
      areaList.visited.push({ id: areaId, name, playerCount: 0 });
      await fs.writeFile(listPath, JSON.stringify(areaList, null, 2));
    }

    return { ok: true };
  }, {
    body: t.Object({
      areaId: t.String(),
      name: t.String()
    })
  })

