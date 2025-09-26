import * as path from "node:path"
import * as fs from "node:fs/promises"

import { AreaInfoSchema } from "../lib/schemas"

const AREA_INDEX_PATH = "./cache/areaIndex.json"
const AREA_INFO_DIR = "./data/area/info"
const AREA_LIST_PATH = "/app/data/area/arealist.json"
const LOCAL_AREA_LIST_PATH = "./data/area/arealist.json"

let objIdCounter = 0

const generateObjectId_ = (timestamp: number, machineId: number, processId: number, counter: number) => {
  const hexTimestamp = Math.floor(timestamp / 1000).toString(16).padStart(8, "0")
  const hexMachineId = machineId.toString(16).padStart(6, "0")
  const hexProcessId = processId.toString(16).padStart(4, "0")
  const hexCounter = counter.toString(16).padStart(6, "0")

  return hexTimestamp + hexMachineId + hexProcessId + hexCounter
}

export const generateObjectId = () => generateObjectId_(Date.now(), 0, 0, objIdCounter++)

const areaIndex: { name: string; description?: string; id: string; playerCount: number }[] = []
const areaByUrlName = new Map<string, string>()

export const buildAreaIndex = async () => {
  const cacheFile = Bun.file(AREA_INDEX_PATH)

  if (await cacheFile.exists()) {
    const cachedIndex = await cacheFile.json()

    for (const area of cachedIndex) {
      const areaUrlName = area.name.replace(/[^-_a-z0-9]/g, "")
      areaByUrlName.set(areaUrlName, area.id)
      areaIndex.push(area)
    }

    return
  }

  const files = await fs.readdir(AREA_INFO_DIR)

  for (let i = 0; i < files.length; i++) {
    const filename = files[i]
    const file = Bun.file(path.join(AREA_INFO_DIR, filename))
    if (!await file.exists()) continue

    try {
      const areaInfo = await file.json().then(AreaInfoSchema.parseAsync)
      if (!areaInfo.name) throw new Error("Missing name field")

      const areaId = path.parse(filename).name
      const areaUrlName = areaInfo.name.replace(/[^-_a-z0-9]/g, "")

      areaByUrlName.set(areaUrlName, areaId)
      areaIndex.push({
        name: areaInfo.name,
        description: areaInfo.description,
        id: areaId,
        playerCount: 0,
      })
    } catch (err) {
      console.warn(`Skipping ${filename}: ${err instanceof Error ? err.message : String(err)}`)
      continue
    }
  }

  await fs.mkdir("./cache", { recursive: true })
  await Bun.write(AREA_INDEX_PATH, JSON.stringify(areaIndex))
}

export const getAreaIndex = () => areaIndex

export const getAreaByUrlNameMap = () => areaByUrlName

export const searchArea = (term: string) => {
  return areaIndex.filter(a => a.name.includes(term))
}

export const findAreaByUrlName = (areaUrlName: string) => {
  return areaByUrlName.get(areaUrlName)
}

export const addAreaToIndex = async (entry: { id: string; name: string; description?: string }) => {
  const normalizedName = entry.name.replace(/[^-_a-z0-9]/g, "")
  areaByUrlName.set(normalizedName, entry.id)

  if (!areaIndex.some(a => a.id === entry.id)) {
    areaIndex.push({
      name: entry.name,
      description: entry.description,
      id: entry.id,
      playerCount: 0,
    })
  }

  await fs.mkdir("./cache", { recursive: true })
  await Bun.write(AREA_INDEX_PATH, JSON.stringify(areaIndex))
}

const readAreaList = async (pathToRead: string) => {
  let areaList: any = {}
  try {
    const file = Bun.file(pathToRead)
    if (await file.exists()) {
      areaList = await file.json()
    }
  } catch {
    // swallow – callers will handle defaults
  }
  return areaList
}

export const getDynamicAreaList = async () => {
  try {
    const file = Bun.file(AREA_LIST_PATH)
    if (await file.exists()) {
      const parsed = await file.json()
      return {
        visited: parsed.visited ?? [],
        created: parsed.created ?? [],
        newest: parsed.newest ?? [],
        popular: parsed.popular ?? [],
        popular_rnd: parsed.popular_rnd ?? [],
        popularNew: parsed.popularNew ?? [],
        popularNew_rnd: parsed.popularNew_rnd ?? [],
        lively: parsed.lively ?? [],
        favorite: parsed.favorite ?? [],
        mostFavorited: parsed.mostFavorited ?? [],
        totalOnline: parsed.totalOnline ?? 0,
        totalAreas: parsed.totalAreas ?? 0,
        totalPublicAreas: parsed.totalPublicAreas ?? 0,
        totalSearchablePublicAreas: parsed.totalSearchablePublicAreas ?? 0
      }
    }
  } catch {
    console.warn("Failed to read arealist.json")
  }

  return {
    visited: [],
    created: [],
    newest: [],
    popular: [],
    popular_rnd: [],
    popularNew: [],
    popularNew_rnd: [],
    lively: [],
    favorite: [],
    mostFavorited: [],
    totalOnline: 0,
    totalAreas: 0,
    totalPublicAreas: 0,
    totalSearchablePublicAreas: 0
  }
}

export const updateAreaList = async (entry: { id: string; name: string }) => {
  const areaList = await readAreaList(LOCAL_AREA_LIST_PATH)

  const newEntry = { ...entry, playerCount: (entry as any).playerCount ?? 0 }

  const visited = areaList.visited ?? []
  const created = areaList.created ?? []
  const newest = areaList.newest ?? []

  if (!visited.some((a: any) => a.id === entry.id)) {
    visited.push(newEntry)
  }
  if (!created.some((a: any) => a.id === entry.id)) {
    created.push(newEntry)
  }

  const updatedNewest = [newEntry, ...newest].slice(0, 50)

  const updatedList = {
    ...areaList,
    visited,
    created,
    newest: updatedNewest,
    totalAreas: (areaList.totalAreas ?? 0) + 1,
    totalPublicAreas: (areaList.totalPublicAreas ?? 0) + 1,
    totalSearchablePublicAreas: (areaList.totalSearchablePublicAreas ?? 0) + 1,
  }

  await fs.mkdir(path.dirname(LOCAL_AREA_LIST_PATH), { recursive: true })
  await fs.writeFile(LOCAL_AREA_LIST_PATH, JSON.stringify(updatedList, null, 2))
}
