// Parse Open Civic Data division IDs like
// "ocd-division/country:us/state:ca/sldu:24" into their parts.
export type Division = { id: string; name: string; state: string | null; type: string; value: string; level: string }

const LEVELS: Record<string, string> = {
  country: "Federal",
  state: "State",
  district: "State",
  cd: "Federal",
  sldu: "State",
  sldl: "State",
  county: "County",
  place: "City",
}

export function parseDivision(id: string, name = ""): Division {
  const parts = id.replace(/^ocd-division\//, "").split("/").map((p) => p.split(":"))
  const state = parts.find(([k]) => k === "state" || k === "district")?.[1] ?? null
  const [type, value] = parts[parts.length - 1] ?? ["", ""]
  const parent = parts.length > 2 ? parts[parts.length - 2][0] : null
  const level = LEVELS[type] ?? (parent && LEVELS[parent]) ?? "Local"
  return { id, name, state, type, value, level }
}

export const isDivisionId = (v: unknown): v is string =>
  typeof v === "string" && v.length < 200 && /^ocd-division\/country:us(\/[a-z_]+:[a-z0-9_~.\-]+)*$/i.test(v)
