// @ts-nocheck
import * as path from "node:path"
import { Elysia, t } from 'elysia'
import * as fs from "node:fs/promises";
import { AreaInfoSchema } from "./lib/schemas";
import { canned_areaList, canned_friendsbystr, canned_forums_favorites } from "./src/canned-data";
import { authRoutes } from "./src/routes/auth";
import { personRoutes } from "./src/routes/person";
import { serverRoutes } from "./src/routes/server";
import { forumRoutes } from "./src/routes/forum";
import { areaRoutes } from "./src/routes/area";
import { placementRoutes } from "./src/routes/placement";
import { inventoryRoutes } from "./src/routes/inventory";
import { thingRoutes } from "./src/routes/thing";
import {
  addAreaToIndex,
  buildAreaIndex,
  findAreaByUrlName,
  generateObjectId,
  getAreaByUrlNameMap,
  getAreaIndex,
  getDynamicAreaList,
  searchArea,
  updateAreaList,
} from "./src/utils";

const HOST = Bun.env.HOST ?? "0.0.0.0";
const PORT_API = Number(Bun.env.PORT_API ?? 8000);
const PORT_CDN_THINGDEFS = Number(Bun.env.PORT_CDN_THINGDEFS ?? 8001);
const PORT_CDN_AREABUNDLES = Number(Bun.env.PORT_CDN_AREABUNDLES ?? 8002);
const PORT_CDN_UGCIMAGES = Number(Bun.env.PORT_CDN_UGCIMAGES ?? 8003);

async function injectInitialAreaToList(areaId: string, areaName: string) {
  const basePath = "./data/area";
  const listPath = `${basePath}/arealist.json`;

  let areaList: any = {};
  try {
    const listFile = Bun.file(listPath);
    if (await listFile.exists()) {
      areaList = await listFile.json();
    }
  } catch {
    console.warn("Couldn't read arealist.json, starting fresh.");
  }

  const newEntry = { id: areaId, name: areaName, playerCount: 0 };

  areaList.visited = [...(areaList.visited ?? []), newEntry];
  areaList.created = [...(areaList.created ?? []), newEntry];
  areaList.newest = [newEntry, ...(areaList.newest ?? [])].slice(0, 50);
  areaList.totalAreas = (areaList.totalAreas ?? 0) + 1;
  areaList.totalPublicAreas = (areaList.totalPublicAreas ?? 0) + 1;
  areaList.totalSearchablePublicAreas = (areaList.totalSearchablePublicAreas ?? 0) + 1;

  await fs.writeFile(listPath, JSON.stringify(areaList, null, 2));
}

async function initDefaults() {
  const accountPath = "./data/person/account.json";

  let accountData: Record<string, any> = {};
  try {
    accountData = JSON.parse(await fs.readFile(accountPath, "utf-8"));
  } catch {
    // Create new identity
    const personId = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
    const screenName = "User" + Math.floor(Math.random() * 10000);
    const homeAreaId = crypto.randomUUID().replace(/-/g, "").slice(0, 24);

    accountData = {
      personId,
      screenName,
      homeAreaId
    };

    await fs.mkdir("./data/person", { recursive: true });
    await fs.writeFile(accountPath, JSON.stringify(accountData, null, 2));
    console.log(`🧠 Memory card initialized for ${screenName}`);
  }

  // Create person info file
  const infoPath = `./data/person/info/${accountData.personId}.json`;
  try {
    await fs.access(infoPath);
  } catch {
    const personInfo = {
      id: accountData.personId,
      screenName: accountData.screenName,
      age: 0,
      statusText: "",
      isFindable: true,
      isBanned: false,
      lastActivityOn: new Date().toISOString(),
      isFriend: false,
      isEditorHere: true,
      isListEditorHere: true,
      isOwnerHere: true,
      isAreaLocked: false,
      isOnline: true
    };

    await fs.mkdir("./data/person/info", { recursive: true });
    await fs.writeFile(infoPath, JSON.stringify(personInfo, null, 2));
    console.log(`📇 Created person info file for ${accountData.screenName}`);
  }
  // Check if home area already exists
  const areaInfoPath = `./data/area/info/${accountData.homeAreaId}.json`;

  try {
    await fs.access(areaInfoPath);
    console.log(`✅ Home area already exists for ${accountData.screenName}, skipping creation`);
    return; // Exit early, skip creating area again
  } catch {
    console.log(`🆕 Creating home area for ${accountData.screenName}`);
  }

  // Create default home area
  const areaId = accountData.homeAreaId;
  const areaName = `${accountData.screenName}'s home`;
  const areaKey = `rr${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const bundleFolder = `./data/area/bundle/${areaId}`;
  await fs.mkdir(bundleFolder, { recursive: true });
  const bundlePath = `${bundleFolder}/${areaKey}.json`;
  await fs.writeFile(bundlePath, JSON.stringify({ thingDefinitions: [], serveTime: 0 }, null, 2));
  const subareaPath = `./data/area/subareas/${areaId}.json`;
  await fs.writeFile(subareaPath, JSON.stringify({ subareas: [] }, null, 2));

  const areaInfo = {
    editors: [
      {
        id: accountData.personId,
        name: accountData.screenName,
        isOwner: true
      }
    ],
    listEditors: [],
    copiedFromAreas: [],
    name: areaName,
    creationDate: new Date().toISOString(),
    totalVisitors: 0,
    isZeroGravity: false,
    hasFloatingDust: false,
    isCopyable: false,
    isExcluded: false,
    renameCount: 0,
    copiedCount: 0,
    isFavorited: false
  };

  const areaLoad = {
    ok: true,
    areaId,
    areaName,
    areaKey,
    areaCreatorId: accountData.personId,
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
    placements: [
      {
        Id: crypto.randomUUID().replace(/-/g, "").slice(0, 24),
        Tid: "000000000000000000000001", // Ground object ID
        P: { x: 0, y: -0.3, z: 0 },
        R: { x: 0, y: 0, z: 0 }
      }
    ],
    serveTime: 17
  };

  const areaBundle = {
    thingDefinitions: [],
    serveTime: 3
  };

  await fs.mkdir(`./data/area/info`, { recursive: true });
  await fs.mkdir(`./data/area/load`, { recursive: true });
  await fs.mkdir(`./data/area/bundle`, { recursive: true });

  await fs.writeFile(`./data/area/info/${areaId}.json`, JSON.stringify(areaInfo, null, 2));
  await fs.writeFile(`./data/area/load/${areaId}.json`, JSON.stringify(areaLoad, null, 2));
  await fs.writeFile(`./data/area/bundle/${areaId}.json`, JSON.stringify(areaBundle, null, 2));

  console.log(`🌍 Created default home area for ${accountData.screenName}`);
}

await initDefaults()

console.log("Building area index...")
await buildAreaIndex()
console.log(`Indexed ${getAreaIndex().length} areas`)

// ✅ Inject default home area into arealist.json if not already present
try {
  const account = JSON.parse(await fs.readFile("./data/person/account.json", "utf-8"));
  const personId = account.personId;
  const personName = account.screenName;
  const defaultAreaId = account.homeAreaId;
  const defaultAreaName = `${personName}'s home`;

  const listPath = "./data/area/arealist.json";
  let alreadyExists = false;

  try {
    const areaList = await Bun.file(listPath).json();
    alreadyExists = areaList.created?.some((a: any) => a.id === defaultAreaId);
  } catch { }

  if (!alreadyExists) {
    await injectInitialAreaToList(defaultAreaId, defaultAreaName);
    console.log(`✅ Injected default area "${defaultAreaName}" into arealist.json`);
  }
} catch {
  console.warn("⚠️ Could not inject default area: account.json missing or invalid.");
}


const app = new Elysia()
  .onRequest(({ request }) => {
    console.info(JSON.stringify({
      ts: new Date().toISOString(),
      ip: request.headers.get('X-Real-Ip'),
      ua: request.headers.get("User-Agent"),
      method: request.method,
      url: request.url,
    }));
  })
  .onError(({ code, error, request }) => {
    console.info("error in middleware!", request.url, code);
    console.log(error);
  })
  .onTransform(({ path, body }) => {
    if (path.includes("placement")) {
      console.log("Placement route hit:", path, JSON.stringify(body, null, 2));
    }
  })
  .onTransform(({ path, body }) => {
    if (path.includes("ach") || path.includes("p")) {
      console.log(`[HEARTBEAT] ${path}:`, JSON.stringify(body));
    }
  })
  .onTransform(({ path, body }) => {
    if (path.includes("inventory")) {
      console.log(`[INVENTORY] ${path}:`, JSON.stringify(body));
    }
  })
  .use(authRoutes)
  .use(personRoutes)
  .use(serverRoutes)
  .use(forumRoutes)
  .use(areaRoutes)
  .use(placementRoutes)
  .use(inventoryRoutes)
  .use(thingRoutes)
  .listen({
    hostname: HOST,
    port: PORT_API,
  })

// Watch for changes in area files and rebuild index
import { watch } from "fs";

const areaFolder = "./data/area/info/";
let debounceTimer;

watch(areaFolder, { recursive: true }, (eventType, filename) => {
  console.log(`[Area Watcher] Detected ${eventType} on ${filename}`);

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    console.log("[Area Watcher] Rebuilding area index...");
    await rebuildAreaIndex(); // Make sure this function exists
  }, 1000); // Wait 1 second after last change
});

import { readdir, readFile } from "fs/promises";

async function rebuildAreaIndex() {
  const areaDir = path.resolve("./data/area/info/");
  const cachePath = path.resolve("./cache/areaIndex.json");

  const index = {};

  try {
    const files = await readdir(areaDir);

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const filePath = path.join(areaDir, file);
      const content = await readFile(filePath, "utf-8");

      try {
        const areaData = JSON.parse(content);
        const areaId = path.basename(file, ".json");

        index[areaId] = {
          areaId,
          urlName: areaData.urlName || null,
          creatorId: areaData.creatorId || null,
          editors: areaData.editors || [],
          tags: areaData.tags || [],
          title: areaData.title || null
        };
      } catch (err) {
        console.warn(`Failed to parse area file ${file}:`, err);
      }
    }

    await fs.writeFile(cachePath, JSON.stringify(index, null, 2));
    console.log(`[Area Index] Rebuilt index with ${Object.keys(index).length} areas`);
  } catch (err) {
    console.error("[Area Index] Failed to rebuild index:", err);
  }
}

console.log(`🦊 API server is running at on port ${app.server?.port}...`)

const app_areaBundles = new Elysia()
  .onRequest(({ request }) => {
    console.info(JSON.stringify({
      server: "AREABUNDLES",
      ts: new Date().toISOString(),
      ip: request.headers.get('X-Real-Ip'),
      ua: request.headers.get("User-Agent"),
      method: request.method,
      url: request.url,
    }));
  })
  .onError(({ code, error }) => {
    console.info("error in middleware!", code, error.message);
  })
  .get(
    "/:areaId/:areaKey", // TODO: areaKeys all seem to start with "rr"
    async ({ params: { areaId, areaKey } }) => {
      const file = Bun.file(path.resolve("./data/area/bundle/", areaId, areaKey + ".json"));

      if (await file.exists()) {
        return await file.json()
      }
      else {
        return new Response("Area bundle not found", { status: 404 })
      }
    },
  )
  .listen({
    hostname: HOST,
    port: PORT_CDN_AREABUNDLES
  })
  ;
console.log(`🦊 AreaBundles server is running at on port ${app_areaBundles.server?.port}...`)


const app_thingDefs = new Elysia()
  .onRequest(({ request }) => {
    console.info(JSON.stringify({
      server: "THINGDEFS",
      ts: new Date().toISOString(),
      ip: request.headers.get('X-Real-Ip'),
      ua: request.headers.get("User-Agent"),
      method: request.method,
      url: request.url,
    }));
  })
  .onError(({ code, error }) => {
    console.info("error in middleware!", code, error.message);
  })
  .get(
    "/:thingId",
    async ({ params: { thingId } }) => {
      const file = Bun.file(path.resolve("./data/thing/def/", thingId + ".json"));
      if (await file.exists()) {
        try {
          return await file.json();

        }
        catch (e) {
          return Response.json("", { status: 200 })
        }
      }
      else {
        console.error("client asked for a thingdef not on disk!!", thingId)
        //return new Response("Thingdef not found", { status: 404 })
        return Response.json("", { status: 200 })
      }

    }
  )
  .listen({
    hostname: HOST,
    port: PORT_CDN_THINGDEFS,
  })
  ;
console.log(`🦊 ThingDefs server is running at on port ${app_thingDefs.server?.port}...`)



const app_ugcImages = new Elysia()
  .onRequest(({ request }) => {
    console.info(JSON.stringify({
      server: "UGCIMAGES",
      ts: new Date().toISOString(),
      ip: request.headers.get('X-Real-Ip'),
      ua: request.headers.get("User-Agent"),
      method: request.method,
      url: request.url,
    }));
  })
  .onError(({ code, error }) => {
    console.info("error in middleware!", code, error.message);
  })
  .get(
    "/:part1/:part2/",
    async ({ params: { part1, part2 } }) => {
      const file = Bun.file(path.resolve("../archiver/images/", `${part1}_${part2}.png`));

      if (await file.exists()) {
        try {
          return await file.json();
        }
        catch (e) {
          return new Response("<html><head><title>404 Not Found</title></head><body><h1>Not Found</h1></body></html>", { status: 404 })
        }
      }
      else {
        console.error("client asked for an ugc image not on disk!!", part1, part2)
        return new Response("<html><head><title>404 Not Found</title></head><body><h1>Not Found</h1></body></html>", { status: 404 })
      }

    }
  )
  .listen({
    hostname: HOST,
    port: PORT_CDN_UGCIMAGES,
  })
  ;
console.log(`🦊 ugcImages server is running at on port ${app_ugcImages.server?.port}...`)

