import type { Config } from "@netlify/functions"
import { civic, civicFailure } from "../lib/civic.mts"
import { parseDivision } from "../lib/divisions.mts"
import { cleanAddress, fail, hash, json, readBody, ttlCache } from "../lib/http.mts"

const cache = ttlCache<unknown>(60 * 60 * 1000)
const ORDER = ["Federal", "State", "County", "City", "Local"]

export default async (req: Request) => {
  const body = await readBody<{ address?: string }>(req)
  const address = cleanAddress(body?.address)
  if (!address) return fail(400, "bad_address", "Please enter a full street address.")

  const key = hash(address.toLowerCase())
  const cached = cache.get(key)
  if (cached) return json(cached)

  try {
    const data = await civic("/divisionsByAddress", { address })
    const divisions = Object.entries<any>(data.divisions ?? {})
      .map(([id, d]) => parseDivision(id, d?.name ?? id))
      .sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level) || a.id.length - b.id.length)
    const result = { normalizedInput: data.normalizedInput ?? null, divisions }
    cache.set(key, result)
    return json(result)
  } catch (err) {
    const f = civicFailure(err)
    return fail(f.status, f.code, f.message)
  }
}

export const config: Config = { path: "/api/districts", method: "POST" }
