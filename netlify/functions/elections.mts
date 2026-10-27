import type { Config } from "@netlify/functions"
import { civic, civicFailure } from "../lib/civic.mts"
import { fail, json } from "../lib/http.mts"

// Google keeps permanent test elections in the list; hide them unless asked.
const TEST_IDS = new Set(["2000", "1001"])

export default async (req: Request) => {
  const includeTest = new URL(req.url).searchParams.get("test") === "1"
  try {
    const data = await civic("/elections")
    const today = new Date().toISOString().slice(0, 10)
    const elections = (data.elections ?? [])
      .filter((e: any) => includeTest || !TEST_IDS.has(e.id))
      .filter((e: any) => e.electionDay >= today)
      .map((e: any) => ({ id: e.id, name: e.name, electionDay: e.electionDay, ocdDivisionId: e.ocdDivisionId }))
      .sort((a: any, b: any) => a.electionDay.localeCompare(b.electionDay))
    return json({ elections }, 200, {
      "Cache-Control": "public, max-age=600",
      "Netlify-CDN-Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
    })
  } catch (err) {
    const f = civicFailure(err)
    return fail(f.status, f.code, f.message)
  }
}

export const config: Config = { path: "/api/elections", method: "GET" }
