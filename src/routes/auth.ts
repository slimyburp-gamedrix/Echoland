import { Elysia, t } from 'elysia'
import * as fs from 'node:fs/promises'

let objIdCounter = 0
const generateObjectId_ = (timestamp: number, machineId: number, processId: number, counter: number) => {
  const hexTimestamp = Math.floor(timestamp / 1000).toString(16).padStart(8, "0")
  const hexMachineId = machineId.toString(16).padStart(6, "0")
  const hexProcessId = processId.toString(16).padStart(4, "0")
  const hexCounter = counter.toString(16).padStart(6, "0")
  return hexTimestamp + hexMachineId + hexProcessId + hexCounter
}
const generateObjectId = () => generateObjectId_(Date.now(), 0, 0, objIdCounter++)

export const authRoutes = new Elysia()
  .post(
    "/auth/start",
    async ({ cookie: { ast } }) => {
      const account = JSON.parse(
        await fs.readFile("./data/person/account.json", "utf-8")
      )

      ast.value = `s:${generateObjectId()}`
      ast.httpOnly = true

      return {
        vMaj: 188,
        vMinSrv: 1,
        personId: account.personId,
        homeAreaId: account.homeAreaId,
        screenName: account.screenName,
        statusText: `exploring around (my id: ${account.personId})`,
        isFindable: true,
        age: 0,
        ageSecs: 0,
        attachments: typeof account.attachments === "string"
          ? account.attachments
          : JSON.stringify(account.attachments ?? {}),
        isSoftBanned: false,
        showFlagWarning: false,
        flagTags: [],
        areaCount: 1,
        thingTagCount: 1,
        allThingsClonable: true,
        achievements: [],
        isEditorHere: true,
        isListEditorHere: true,
        isOwnerHere: true,
        hasEditTools: true,
        hasEditToolsPermanently: true,
        editToolsExpiryDate: null,
        isInEditToolsTrial: false,
        wasEditToolsTrialEverActivated: false,
        customSearchWords: ""
      }
    },
    {
      cookie: t.Object({
        ast: t.Optional(t.String())
      })
    }
  )


