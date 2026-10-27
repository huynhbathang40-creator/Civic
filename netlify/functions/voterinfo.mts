import type { Config } from "@netlify/functions"
import { civic, civicFailure } from "../lib/civic.mts"
import { distanceMiles, geocode } from "../lib/geocode.mts"
import { cleanAddress, fail, hash, json, readBody, ttlCache } from "../lib/http.mts"

// Some responses (vote-center counties, the test election) list hundreds of
// sites. Send the nearest few of each kind; the client only needs those.
const MAX_SITES = 20
const cache = ttlCache<unknown>(15 * 60 * 1000)

type LatLng = { lat: number; lng: number }

function formatAddress(a: any = {}) {
  const street = [a.line1, a.line2, a.line3].filter(Boolean).join(", ")
  return [street, a.city, [a.state, a.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")
}

function sites(list: any[] = [], origin: LatLng | null) {
  const mapped = list.map((s) => {
    const hasCoords = typeof s.latitude === "number" && typeof s.longitude === "number"
    const point = hasCoords ? { lat: s.latitude, lng: s.longitude } : null
    return {
      name: s.address?.locationName ?? "",
      address: formatAddress(s.address),
      hours: s.pollingHours ?? null,
      notes: s.notes ?? null,
      startDate: s.startDate ?? null,
      endDate: s.endDate ?? null,
      lat: point?.lat ?? null,
      lng: point?.lng ?? null,
      distanceMiles: origin && point ? Math.round(distanceMiles(origin, point) * 10) / 10 : null,
    }
  })
  if (origin) mapped.sort((a, b) => (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity))
  return mapped.slice(0, MAX_SITES)
}

// Earliest start and latest end across all early-vote sites (not just the nearest).
function dateRange(list: any[] = []) {
  const starts = list.map((s) => s.startDate).filter(Boolean).sort()
  const ends = list.map((s) => s.endDate).filter(Boolean).sort()
  return starts.length ? { start: starts[0], end: ends[ends.length - 1] ?? null } : null
}

function contest(c: any) {
  const isMeasure = Boolean(c.referendumTitle || c.referendumText) || /referendum|measure/i.test(c.type ?? "")
  return {
    kind: isMeasure ? "measure" : "office",
    type: c.type ?? null,
    title: c.ballotTitle ?? c.office ?? c.referendumTitle ?? "Contest",
    office: c.office ?? null,
    district: c.district?.name ?? null,
    scope: c.district?.scope ?? null,
    numberVotingFor: c.numberVotingFor ? Number(c.numberVotingFor) : null,
    ballotPlacement: c.ballotPlacement ? Number(c.ballotPlacement) : null,
    // Candidates stay in API order: the app never ranks them.
    candidates: (c.candidates ?? []).map((p: any) => ({
      name: p.name,
      party: p.party ?? null,
      url: p.candidateUrl ?? null,
      email: p.email ?? null,
      phone: p.phone ?? null,
      channels: (p.channels ?? []).map((ch: any) => ({ type: ch.type, id: ch.id })),
    })),
    measure: isMeasure
      ? {
          title: c.referendumTitle ?? c.ballotTitle ?? null,
          subtitle: c.referendumSubtitle ?? null,
          text: c.referendumText ?? null,
          brief: c.referendumBrief ?? null,
          pro: c.referendumProStatement ?? null,
          con: c.referendumConStatement ?? null,
          effect: c.referendumEffectOfAbstain ?? null,
          threshold: c.referendumPassageThreshold ?? null,
          url: c.referendumUrl ?? null,
          responses: c.referendumBallotResponses ?? ["Yes", "No"],
        }
      : null,
  }
}

function adminBody(body: any = {}, name: string | undefined) {
  return {
    name: name ?? null,
    office: body.name ?? null,
    infoUrl: body.electionInfoUrl ?? null,
    registrationUrl: body.electionRegistrationUrl ?? null,
    registrationCheckUrl: body.electionRegistrationConfirmationUrl ?? null,
    absenteeUrl: body.absenteeVotingInfoUrl ?? null,
    ballotInfoUrl: body.ballotInfoUrl ?? null,
    locationFinderUrl: body.votingLocationFinderUrl ?? null,
    rulesUrl: body.electionRulesUrl ?? null,
    address: formatAddress(body.physicalAddress ?? body.correspondenceAddress) || null,
    officials: (body.electionOfficials ?? []).map((o: any) => ({
      name: o.name ?? null,
      title: o.title ?? null,
      phone: o.officePhoneNumber ?? null,
      email: o.emailAddress ?? null,
    })),
  }
}

export default async (req: Request) => {
  const body = await readBody<{ address?: string; electionId?: string }>(req)
  const address = cleanAddress(body?.address)
  if (!address) return fail(400, "bad_address", "Please enter a full street address.")
  const electionId = body?.electionId && /^\d+$/.test(body.electionId) ? body.electionId : undefined

  const key = hash(address.toLowerCase(), electionId ?? "")
  const cached = cache.get(key)
  if (cached) return json(cached)

  try {
    const [data, origin] = await Promise.all([
      civic("/voterinfo", { address, electionId, returnAllAvailableData: "true" }),
      geocode(address),
    ])
    const state = data.state?.[0]
    const result = {
      election: data.election ?? null,
      otherElections: data.otherElections ?? [],
      normalizedInput: data.normalizedInput ?? null,
      origin,
      mailOnly: Boolean(data.mailOnly),
      precinctId: data.precinctId ?? null,
      counts: {
        pollingLocations: data.pollingLocations?.length ?? 0,
        earlyVoteSites: data.earlyVoteSites?.length ?? 0,
        dropOffLocations: data.dropOffLocations?.length ?? 0,
      },
      earlyVoting: dateRange(data.earlyVoteSites),
      pollingLocations: sites(data.pollingLocations, origin),
      earlyVoteSites: sites(data.earlyVoteSites, origin),
      dropOffLocations: sites(data.dropOffLocations, origin),
      contests: (data.contests ?? []).map(contest),
      electionOffices: state
        ? [
            adminBody(state.electionAdministrationBody, state.name),
            ...(state.local_jurisdiction
              ? [adminBody(state.local_jurisdiction.electionAdministrationBody, state.local_jurisdiction.name)]
              : []),
          ]
        : [],
    }
    cache.set(key, result)
    return json(result)
  } catch (err) {
    const f = civicFailure(err)
    return fail(f.status, f.code, f.message)
  }
}

export const config: Config = { path: "/api/voterinfo", method: "POST" }
