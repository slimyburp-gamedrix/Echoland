### Echoland game-server cleanup and improvement plan

This document summarizes concrete fixes and improvements identified in `game-server.ts` and related files. Items are grouped by impact and theme, with actionable guidance and example edits.

---

## High‑impact bugs to fix first

- **Double server start (port conflicts)**
  - The main `app` is listened twice; keep a single `.listen` call.
  - Remove one of the following blocks:
    - `app.listen({ hostname: HOST, port: PORT_API })`
    - `app.listen({ hostname: "0.0.0.0", port: 8000 })`

- **`/area/load` inverted logic and misleading error**
  - In the `areaUrlName` branch, the logic is reversed. Use the found `areaId` when present; otherwise return the denial response and log the miss.
  - Replace the inner block with:

    ```ts
    const areaId = findAreaByUrlName(areaUrlName);
    if (areaId) {
      return await Bun.file(path.resolve("./data/area/load/", `${areaId}.json`)).json();
    } else {
      console.error("Couldn't find area in index:", areaUrlName);
      return Response.json({ ok: false, _reasonDenied: "Private", serveTime: 13 }, { status: 200 });
    }
    ```

- **Duplicate route registration (`/area/lists`)**
  - There are two `POST /area/lists` handlers. Remove the canned‑only one and keep the merged dynamic version.

- **Cache filename casing mismatch**
  - Use a single canonical path everywhere, e.g. `./cache/areaIndex.json` (camel I).
  - Align all reads/writes and the watcher’s rebuild with that filename.

- **Subareas casing mismatch**
  - When initializing subareas, write `subAreas` (capital A) to match the schema and reader code.

---

## Immediate cleanups (correctness/TypeScript hygiene)

- **Deduplicate/conflicting imports**
  - Remove duplicate `import { mkdir, writeFile } from "fs/promises"`.
  - Use one `path` import style consistently: `import * as path from "node:path"`.
  - Avoid importing both default `path` and namespace `path` in the same file.

- **Duplicate endpoint**
  - `/thing/def/:id` is registered twice; keep one.

- **Hardcoded IDs**
  - Replace magic IDs like `creatorId: "5849ac39e1d59629111a4309"` with values loaded from `./data/person/account.json` (as done elsewhere).

---

## API consistency and validation

- **Environment configuration**
  - Centralize env handling at the top, prefer `Bun.env` in Bun apps, and validate required vars.
  - Example:

    ```ts
    const HOST = Bun.env.HOST ?? "0.0.0.0";
    const PORT_API = Number(Bun.env.PORT_API ?? 8000);
    const PORT_CDN_THINGDEFS = Number(Bun.env.PORT_CDN_THINGDEFS ?? 8001);
    const PORT_CDN_AREABUNDLES = Number(Bun.env.PORT_CDN_AREABUNDLES ?? 8002);
    const PORT_CDN_UGCIMAGES = Number(Bun.env.PORT_CDN_UGCIMAGES ?? 8003);
    ```

- **Uniform JSON responses**
  - For consistency, return `Response` with `Content-Type: application/json` for all JSON endpoints. A few handlers return plain objects; wrap them.

- **Request validation**
  - Leverage `zod` schemas (already present in `lib/schemas.ts`) or `elysia`’s `t` consistently. Avoid `t.Unknown()` on mutating routes; define explicit schemas.

---

## Data model and file I/O

- **Atomic writes**
  - For frequently updated JSON (e.g. `arealist.json`, placement files, `area/load/*.json`), write to a temp file and `rename` to reduce corruption risk.

- **Area index structure and cache**
  - Ensure `rebuildAreaIndex()` writes the same structure you read elsewhere (currently writes an object keyed by id, while earlier code expects an array of entries). Pick one representation and standardize.
  - Keep filename and structure consistent across:
    - initial build (startup),
    - cache read/write,
    - watcher rebuild.

---

## Routing and structure

- **Split `game-server.ts` into modules**
  - Suggested breakdown:
    - `routes/auth.ts`, `routes/area.ts`, `routes/placement.ts`, `routes/thing.ts`, `routes/person.ts`, `routes/forum.ts`
    - `services/area-index.ts`, `services/files.ts`, `services/logger.ts`
    - `lib/constants.ts`, `lib/slug.ts`, `lib/config.ts`
  - Register route groups via Elysia plugins to reduce the 2k+ LOC monolith and improve testability.

- **Avoid internal route invocation**
  - Replace patterns like `app.routes.find(...).handler(...)` with shared functions (e.g., `getPlacementInfo(areaId, placementId)`) used by both routes.

---

## UGC/images and static content

- **Serve binary images correctly**
  - For `/:part1/:part2` image route, stream the file with `image/png` content type instead of attempting `file.json()`:

    ```ts
    const file = Bun.file(path.resolve("../archiver/images/", `${part1}_${part2}.png`));
    if (await file.exists()) {
      return new Response(file, { headers: { "Content-Type": "image/png" } });
    }
    return new Response("Not Found", { status: 404 });
    ```

---

## Observability and DX

- **Structured logger**
  - Introduce a simple logger with levels (`debug/info/warn/error`), request correlation id, and server label (API/THINGDEFS/AREABUNDLES/UGCIMAGES). Centralize instead of scattered `console.*`.

- **Linting/formatting and TS strictness**
  - Add ESLint + Prettier configs; enable TypeScript strict mode (`strict: true`, `noImplicitAny`, `exactOptionalPropertyTypes`).
  - These will surface duplicate imports, shadowed variables, and type issues like the untyped debounce timer.

- **Basic tests**
  - Add Bun tests for:
    - Area index build/read parity
    - `/area/load` by `areaId` and by `areaUrlName`
    - Placement CRUD happy path
    - `getDynamicAreaList` merge behavior

---

## Performance and safety

- **Typed debounce**
  - Type the debounce handle: `let debounceTimer: ReturnType<typeof setTimeout> | undefined;` and guard clears.

- **Slug generation**
  - Centralize URL‑name generation (e.g., `slugify(name)`) to avoid regex drift and ensure consistent mapping.

---

## Optional: proposed directory layout

```text
echoland/
  lib/
    config.ts
    constants.ts
    slug.ts
  services/
    area-index.ts
    files.ts
    logger.ts
  routes/
    auth.ts
    area.ts
    placement.ts
    thing.ts
    person.ts
    forum.ts
  game-server.ts  (bootstrap: import and register plugins, start servers)
```

---

## Quick checklist

- [ ] Remove duplicate `app.listen` call
- [ ] Fix `/area/load` logic for `areaUrlName`
- [ ] Remove duplicate `POST /area/lists` route
- [ ] Unify cache filename and index structure
- [ ] Write `subAreas` with correct casing in JSON
- [ ] Deduplicate imports and standardize `node:path`
- [ ] Remove duplicate `/thing/def/:id` route
- [ ] Replace hardcoded IDs with account data
- [ ] Centralize env via `Bun.env` and validate
- [ ] Return `Response` with JSON content type consistently
- [ ] Add atomic writes for frequently updated JSON
- [ ] Extract internal route logic to shared functions
- [ ] Serve UGC images with `image/png` content type
- [ ] Add logger, linting/formatting, and TS strict mode
- [ ] Add basic tests (area, placement, search)


