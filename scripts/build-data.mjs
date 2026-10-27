// Build-time data for the app (no database):
//  1. netlify/data/legislators.json - current members of Congress, trimmed,
//     bundled into the officials function.
//  2. public/data/insights.json - F6 polling access stats per county, from the
//     Civic API (sites listed for a sample address in each county) and Census
//     ACS citizen voting-age population.
// Every step is best effort: on failure the previously committed file is kept
// so a flaky upstream never breaks a deploy.
import { readFile, writeFile } from "node:fs/promises"

const LEGISLATORS_URL = "https://unitedstates.github.io/congress-legislators/legislators-current.json"
const CIVIC = "https://www.googleapis.com/civicinfo/v2"
const ACS = "https://api.census.gov/data/2023/acs/acs5"
const civicKey = process.env.GOOGLE_CIVIC_API_KEY

const log = (...a) => console.log("[build-data]", ...a)
const getJson = async (url) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`${res.status} ${url.toString().replace(/key=[^&]+/, "key=***")}`)
  return res.json()
}

async function legislators() {
  try {
    const raw = await getJson(LEGISLATORS_URL)
    const trimmed = raw.map((p) => {
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
    await writeFile("netlify/data/legislators.json", JSON.stringify(trimmed))
    log(`legislators: ${trimmed.length}`)
  } catch (e) {
    log(`legislators: kept existing file (${e.message})`)
  }
}

async function cvap(fips) {
  // B29001_001E: citizen voting-age population.
  const url = `${ACS}?get=NAME,B29001_001E&for=county:${fips.slice(2)}&in=state:${fips.slice(0, 2)}`
  const rows = await getJson(url)
  return Number(rows[1][1])
}

async function insights() {
  if (!civicKey) return log("insights: skipped (GOOGLE_CIVIC_API_KEY not set for builds)")
  const counties = JSON.parse(await readFile("scripts/insights-counties.json", "utf8"))
  let election
  try {
    const { elections = [] } = await getJson(`${CIVIC}/elections?key=${civicKey}`)
    const today = new Date().toISOString().slice(0, 10)
    election = elections
      .filter((e) => !["2000", "1001"].includes(e.id) && e.electionDay >= today)
      .sort((a, b) => a.electionDay.localeCompare(b.electionDay))[0]
  } catch (e) {
    return log(`insights: kept existing file (${e.message})`)
  }
  if (!election) return log("insights: no upcoming election, kept existing file")

  const rows = []
  for (const c of counties) {
    const url = new URL(`${CIVIC}/voterinfo`)
    url.searchParams.set("address", c.address)
    url.searchParams.set("electionId", election.id)
    url.searchParams.set("returnAllAvailableData", "true")
    url.searchParams.set("key", civicKey)
    const [info, pop] = await Promise.allSettled([getJson(url), cvap(c.fips)])
    const d = info.status === "fulfilled" ? info.value : null
    const votingAgeCitizens = pop.status === "fulfilled" ? pop.value : null
    const pollingSites = d?.pollingLocations?.length ?? 0
    const earlyVoteSites = d?.earlyVoteSites?.length ?? 0
    const dropOffSites = d?.dropOffLocations?.length ?? 0
    const inPerson = pollingSites + earlyVoteSites
    rows.push({
      fips: c.fips,
      county: c.county,
      state: c.state,
      hasData: Boolean(d) && pollingSites + earlyVoteSites + dropOffSites > 0,
      pollingSites,
      earlyVoteSites,
      dropOffSites,
      votingAgeCitizens,
      votersPerSite: votingAgeCitizens && inPerson ? Math.round(votingAgeCitizens / inPerson) : null,
    })
  }
  if (!rows.some((r) => r.hasData)) return log("insights: no county returned data, kept existing file")
  const out = {
    generatedAt: new Date().toISOString(),
    election: { id: election.id, name: election.name, electionDay: election.electionDay },
    method:
      "Sites are the polling places, early-vote sites and drop boxes the Google Civic Information API lists for one sample address in each county (the county seat). Voters per site divides the county's citizen voting-age population (Census ACS 5-year, table B29001) by in-person sites (polling plus early vote).",
    counties: rows,
  }
  await writeFile("public/data/insights.json", JSON.stringify(out, null, 1))
  log(`insights: ${rows.filter((r) => r.hasData).length}/${rows.length} counties with data`)
}

await Promise.all([legislators(), insights()])
