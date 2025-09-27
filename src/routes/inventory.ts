import { Elysia, t } from 'elysia'
import * as fs from 'node:fs/promises'

export const inventoryRoutes = new Elysia()
  .post("/inventory/save", async ({ body }) => {
    // Accept one of:
    // - { ids: [...] }
    // - { id: "..." }
    // - { page: number|string, inventoryItem: string }  // from client logs
    const invUpdate = body as any;

    let personId = "unknown";
    try {
      const account = JSON.parse(await fs.readFile("./data/person/account.json", "utf-8"));
      personId = account.personId || personId;
    } catch { }

    // Load account.json and embed inventory there
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

    let current: { ids?: string[]; pages?: Record<string, any[]> } = accountData.inventory || {};
    if (!current) current = {};

    if (Array.isArray(invUpdate?.ids)) {
      current.ids = invUpdate.ids.map(String);
    } else if (invUpdate?.id !== undefined) {
      const id = String(invUpdate.id);
      if (!current.ids) current.ids = [];
      if (!current.ids.includes(id)) current.ids.push(id);
    } else if (invUpdate?.page !== undefined && typeof invUpdate?.inventoryItem === "string") {
      const pageKey = String(invUpdate.page);
      if (!current.pages) current.pages = {};
      if (!Array.isArray(current.pages[pageKey])) current.pages[pageKey] = [];
      let parsedItem: any = invUpdate.inventoryItem;
      try { parsedItem = JSON.parse(invUpdate.inventoryItem); } catch { }
      current.pages[pageKey].push(parsedItem);
    } else {
      return new Response(JSON.stringify({ ok: false, error: "Missing ids, id or (page, inventoryItem)" }), {
        status: 422,
        headers: { "Content-Type": "application/json" }
      });
    }

    accountData.inventory = current;
    await fs.writeFile(accountPath, JSON.stringify(accountData, null, 2));

    // Also mirror to per-user inventory file for compatibility
    const invDir = `./data/person/inventory`;
    const invPath = `${invDir}/${personId}.json`;
    await fs.mkdir(invDir, { recursive: true });
    await fs.writeFile(invPath, JSON.stringify(current, null, 2));

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }, {
    body: t.Unknown(),
    type: "form"
  })
  .post("/inventory/delete", async ({ body }) => {
    // Delete item from inventory: { page: number|string, thingId: string }
    const { page, thingId } = body as any;

    if (page === undefined || thingId === undefined) {
      return new Response(JSON.stringify({ ok: false, error: "Missing page or thingId" }), {
        status: 422,
        headers: { "Content-Type": "application/json" }
      });
    }

    let personId = "unknown";
    try {
      const account = JSON.parse(await fs.readFile("./data/person/account.json", "utf-8"));
      personId = account.personId || personId;
    } catch { }

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

    let current: { ids?: string[]; pages?: Record<string, any[]> } = accountData.inventory || {};
    if (!current) current = {};

    const pageKey = String(page);
    if (current.pages && current.pages[pageKey] && Array.isArray(current.pages[pageKey])) {
      // Find and remove item by thingId
      const initialLength = current.pages[pageKey].length;
      current.pages[pageKey] = current.pages[pageKey].filter((item: any) => {
        if (typeof item === 'string') {
          try {
            const parsed = JSON.parse(item);
            return parsed.Tid !== thingId;
          } catch {
            return true; // Keep if can't parse
          }
        } else if (typeof item === 'object' && item !== null) {
          return item.Tid !== thingId;
        }
        return true; // Keep if not an object
      });

      const removedCount = initialLength - current.pages[pageKey].length;
      if (removedCount > 0) {
        console.log(`[INVENTORY] deleted ${removedCount} item(s) with thingId ${thingId} from page ${page}`);
      }
    }

    accountData.inventory = current;
    await fs.writeFile(accountPath, JSON.stringify(accountData, null, 2));

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }, {
    body: t.Object({
      page: t.Union([t.String(), t.Number()]),
      thingId: t.String()
    }),
    type: "form"
  })
  .post("/inventory/move", async ({ body }) => {
    // Move item within inventory: { fromPage: number|string, fromIndex: number, toPage: number|string, toIndex: number }
    const { fromPage, fromIndex, toPage, toIndex } = body as any;

    if (fromPage === undefined || fromIndex === undefined || toPage === undefined || toIndex === undefined) {
      return new Response(JSON.stringify({ ok: false, error: "Missing fromPage, fromIndex, toPage, or toIndex" }), {
        status: 422,
        headers: { "Content-Type": "application/json" }
      });
    }

    let personId = "unknown";
    try {
      const account = JSON.parse(await fs.readFile("./data/person/account.json", "utf-8"));
      personId = account.personId || personId;
    } catch { }

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

    let current: { ids?: string[]; pages?: Record<string, any[]> } = accountData.inventory || {};
    if (!current) current = {};
    if (!current.pages) current.pages = {};

    const fromPageKey = String(fromPage);
    const toPageKey = String(toPage);
    const fromIdx = parseInt(String(fromIndex), 10);
    const toIdx = parseInt(String(toIndex), 10);

    // Ensure both pages exist
    if (!Array.isArray(current.pages[fromPageKey])) current.pages[fromPageKey] = [];
    if (!Array.isArray(current.pages[toPageKey])) current.pages[toPageKey] = [];

    // Move item if valid indices
    if (fromIdx >= 0 && fromIdx < current.pages[fromPageKey].length) {
      const item = current.pages[fromPageKey].splice(fromIdx, 1)[0];
      if (toIdx >= 0 && toIdx <= current.pages[toPageKey].length) {
        current.pages[toPageKey].splice(toIdx, 0, item);
        console.log(`[INVENTORY] moved item from page ${fromPage}[${fromIdx}] to page ${toPage}[${toIdx}]`);
      }
    }

    accountData.inventory = current;
    await fs.writeFile(accountPath, JSON.stringify(accountData, null, 2));

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }, {
    body: t.Object({
      fromPage: t.Union([t.String(), t.Number()]),
      fromIndex: t.Number(),
      toPage: t.Union([t.String(), t.Number()]),
      toIndex: t.Number()
    }),
    type: "form"
  })
  .post("/inventory/update", async ({ body }) => {
    // Mirror /inventory/save behavior; some clients call update
    const invUpdate = body as any;

    let personId = "unknown";
    try {
      const account = JSON.parse(await fs.readFile("./data/person/account.json", "utf-8"));
      personId = account.personId || personId;
    } catch { }

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

    let current: { ids?: string[]; pages?: Record<string, string[]> } = accountData.inventory || {};
    if (!current) current = {};

    if (Array.isArray(invUpdate?.ids)) {
      current.ids = invUpdate.ids.map(String);
    } else if (invUpdate?.id !== undefined) {
      const id = String(invUpdate.id);
      if (!current.ids) current.ids = [];
      if (!current.ids.includes(id)) current.ids.push(id);
    } else if (invUpdate?.page !== undefined && typeof invUpdate?.inventoryItem === "string") {
      const pageKey = String(invUpdate.page);
      if (!current.pages) current.pages = {};
      if (!Array.isArray(current.pages[pageKey])) current.pages[pageKey] = [];

      let parsedItem: any = invUpdate.inventoryItem;
      try { parsedItem = JSON.parse(invUpdate.inventoryItem); } catch { }

      // Find and replace existing item with same Tid, or add if not found
      const thingId = parsedItem?.Tid;
      if (thingId) {
        let found = false;
        for (let i = 0; i < current.pages[pageKey].length; i++) {
          const existingItem = current.pages[pageKey][i] as any;
          let existingTid = null;

          if (typeof existingItem === 'string') {
            try {
              const parsed = JSON.parse(existingItem);
              existingTid = parsed.Tid;
            } catch { }
          } else if (typeof existingItem === 'object' && existingItem !== null) {
            existingTid = existingItem.Tid;
          }

          if (existingTid === thingId) {
            current.pages[pageKey][i] = parsedItem;
            found = true;
            console.log(`[INVENTORY] updated item with thingId ${thingId} on page ${pageKey}`);
            break;
          }
        }

        if (!found) {
          current.pages[pageKey].push(parsedItem);
          console.log(`[INVENTORY] added new item with thingId ${thingId} to page ${pageKey}`);
        }
      } else {
        // Fallback: just add the item
        current.pages[pageKey].push(parsedItem);
      }
    } else {
      return new Response(JSON.stringify({ ok: false, error: "Missing ids, id or (page, inventoryItem)" }), {
        status: 422,
        headers: { "Content-Type": "application/json" }
      });
    }

    accountData.inventory = current;
    await fs.writeFile(accountPath, JSON.stringify(accountData, null, 2));

    const invDir = `./data/person/inventory`;
    const invPath = `${invDir}/${personId}.json`;
    await fs.mkdir(invDir, { recursive: true });
    await fs.writeFile(invPath, JSON.stringify(current, null, 2));

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }, {
    body: t.Unknown(),
    type: "form"
  })
  .get("/inventory/:page", async ({ params }) => {
    const pageParam = params?.page;
    const page = Math.max(0, parseInt(String(pageParam), 10) || 0);

    // Load current user id from account.json
    let personId = "unknown";
    try {
      const account = JSON.parse(await fs.readFile("./data/person/account.json", "utf-8"));
      personId = account.personId || personId;
    } catch { }

    const invPath = `./data/person/inventory/${personId}.json`;
    let items: string[] = [];
    try {
      const file = Bun.file(invPath);
      if (await file.exists()) {
        const data = await file.json();
        if (Array.isArray(data?.ids)) items = data.ids;
      }
    } catch { }

    // Prefer inventory stored in account.json
    let usedPaged = false;
    try {
      const account = JSON.parse(await fs.readFile("./data/person/account.json", "utf-8"));
      const inv = account?.inventory;
      if (inv && inv.pages && typeof inv.pages === "object") {
        const pageItems = inv.pages[String(page)];
        if (Array.isArray(pageItems)) {
          items = pageItems;
          usedPaged = true;
        }
      }
    } catch { }

    // If using paged store, items already represent this page; otherwise paginate flat list
    const pageSize = 20;
    const start = page * pageSize;
    const slice = usedPaged ? items : items.slice(start, start + pageSize);

    console.log(`[INVENTORY] resolved page ${page} → count=${slice.length}`);

    return new Response(JSON.stringify({ inventoryItems: slice }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  })

