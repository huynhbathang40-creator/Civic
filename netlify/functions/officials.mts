import type { Config } from "@netlify/functions"
import bundled from "../data/legislators.json" with { type: "json" }
import { isDivisionId, parseDivision } from "../lib/divisions.mts"
import { fail, json, readBody, ttlCache } from "../lib/http.mts"

// Google retired the Representatives API, so officials come from open data:
// federal from the unitedstates/congress-legislators dataset (bundled at build
// time by scripts/build-data.mjs) and state legislators from OpenStates.
const LEGISLATORS_URL = "https://unitedstates.github.io/congress-legislators/legislators-current.json"
const OPENSTATES_URL = "https://v3.openstates.org/people"

type Official = {
  name: string
  office: string
  level: "Federal" | "State"
  party: string | null
  divisionId: string
  phone: string | null
  email: string | null
  url: string | null
  contactUrl: string | null
  source: string
}

type Legislator = {
  name: string
  type: "sen" | "rep"
  state: string
  district: number | null
  party: string | null
  url: string | null
  phone: string | null
  contactForm: string | null
}

let legislators: Legislator[] | null = (bundled as Legislator[]).length ? (bundled as Legislator[]) : null
const stateCache = ttlCache<Official[]>(6 * 60 * 60 * 1000)

async function loadLegislators(): Promise<Legislator[]> {
  if (legislators) return legislators
  const res = await fetch(LEGISLATORS_URL, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error("legislators fetch failed")
  const raw = await res.json()
  legislators = raw.map((p: any) => {
    const t = p.terms[p.terms.length - 1]
    return {
      name: p.name.official_full ?? `${p.name.first} ${p.name.last}`,
      type: t.type,
      state: t.state,
      district: typeof t.district === "number" ? t.district : null,
      party: t.party ?? null,
      url: t.url ?? null,
      phone: t.phone ?? null,
      contactForm: t.contact_form ?? null,
    }
  })
  return legislators!
}

async function federalOfficials(state: string, cdId: string | null, cdValue: string | null): Promise<Official[]> {
  const all = await loadLegislators()
  const st = state.toUpperCase()
  const district = cdValue && /^\d+$/.test(cdValue) ? Number(cdValue) : null
  const stateDiv = `ocd-division/country:us/state:${state}`
  return all
    .filter((l) => l.state === st && (l.type === "sen" || l.district === district || l.district === 0))
    .sort((a, b) => (a.type === b.type ? 0 : a.type === "sen" ? -1 : 1))
    .map((l) => ({
      name: l.name,
      office: l.type === "sen" ? "U.S. Senator" : l.district === 0 ? "U.S. Representative (at large)" : `U.S. Representative, District ${l.district}`,
      level: "Federal" as const,
      party: l.party,
      divisionId: l.type === "sen" || !cdId ? stateDiv : cdId,
      phone: l.phone,
      email: null,
      url: l.url,
      contactUrl: l.contactForm,
      source: "congress-legislators",
    }))
}

// OCD uses "1st_middlesex" where OpenStates uses "1st Middlesex"; numbers pass through.
const districtName = (value: string) =>
  value.replace(/_/g, " ").replace(/\b([a-z])([a-z]*)/g, (_, a: string, b: string) => a.toUpperCase() + b)

async function stateLegislators(divisionId: string, apiKey: string): Promise<Official[]> {
  const cached = stateCache.get(divisionId)
  if (cached) return cached
  const d = parseDivision(divisionId)
  const url = new URL(OPENSTATES_URL)
  url.searchParams.set("jurisdiction", d.state!)
  url.searchParams.set("org_classification", d.type === "sldu" ? "upper" : "lower")
  url.searchParams.set("district", districtName(d.value))
  url.searchParams.append("include", "links")
  url.searchParams.append("include", "offices")
  const res = await fetch(url, { headers: { "X-API-KEY": apiKey }, signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`openstates ${res.status}`)
  const data = await res.json()
  const people: Official[] = (data.results ?? []).map((p: any) => {
    const office = (p.offices ?? []).find((o: any) => o.voice) ?? {}
    return {
      name: p.name,
      office: `${p.current_role?.title ?? (d.type === "sldu" ? "State Senator" : "State Representative")}, District ${p.current_role?.district ?? d.value}`,
      level: "State" as const,
      party: p.party ?? null,
      divisionId,
      phone: office.voice ?? null,
      email: p.email ?? null,
      url: p.links?.[0]?.url ?? p.openstates_url ?? null,
      contactUrl: p.openstates_url ?? null,
      source: "OpenStates",
    }
  })
  stateCache.set(divisionId, people)
  return people
}

export default async (req: Request) => {
  const body = await readBody<{ divisions?: unknown[] }>(req)
  const ids = (Array.isArray(body?.divisions) ? body!.divisions : []).filter(isDivisionId).slice(0, 40)
  if (!ids.length) return fail(400, "bad_request", "No districts were provided.")

  const parsed = ids.map((id) => parseDivision(id))
  const state = parsed.find((d) => d.state)?.state ?? null
  const cd = parsed.find((d) => d.type === "cd") ?? null
  const legislative = parsed.filter((d) => d.type === "sldu" || d.type === "sldl")
  const notes: string[] = []
  const officials: Official[] = []

  if (state) {
    try {
      officials.push(...(await federalOfficials(state, cd?.id ?? null, cd?.value ?? null)))
    } catch {
      notes.push("Federal officials are temporarily unavailable.")
    }
  }

  const openStatesKey = Netlify.env.get("OPENSTATES_API_KEY")
  if (!openStatesKey) {
    if (legislative.length) notes.push("State legislators are not available yet: the OpenStates key is not configured.")
  } else {
    const results = await Promise.allSettled(legislative.map((d) => stateLegislators(d.id, openStatesKey)))
    for (const r of results) if (r.status === "fulfilled") officials.push(...r.value)
    if (results.some((r) => r.status === "rejected")) notes.push("Some state legislators could not be loaded.")
  }

  return json({ officials, notes, sources: ["congress-legislators (theunitedstates.io)", "OpenStates"] })
}

export const config: Config = { path: "/api/officials", method: "POST" }
