// Thin client for the Google Civic Information API v2.
const BASE = "https://www.googleapis.com/civicinfo/v2"

export class CivicError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
  }
}

export async function civic(path: string, params: Record<string, string | undefined> = {}) {
  const key = Netlify.env.get("GOOGLE_CIVIC_API_KEY")
  if (!key) throw new CivicError(500, "not_configured", "The Civic API key is not configured on the server.")

  const url = new URL(BASE + path)
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v)
  url.searchParams.set("key", key)

  let res: Response
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  } catch {
    throw new CivicError(504, "upstream_timeout", "The election data service did not respond in time.")
  }
  const body = await res.json().catch(() => ({}))
  if (res.ok) return body

  const message: string = body?.error?.message ?? ""
  if (res.status === 429 || (res.status === 403 && /quota|rate/i.test(message)))
    throw new CivicError(429, "rate_limited", "Too many lookups right now. Please try again in a minute.")
  if (/parse address/i.test(message))
    throw new CivicError(400, "bad_address", "We couldn't understand that address. Try including the street, city and state.")
  if (/election unknown|no election|not found/i.test(message) || res.status === 404)
    throw new CivicError(404, "no_election_data", "There is no election data for this address yet.")
  throw new CivicError(502, "upstream_error", "The election data service returned an error.")
}

export const civicFailure = (err: unknown) => {
  if (err instanceof CivicError) return { status: err.status, code: err.code, message: err.message }
  return { status: 500, code: "internal", message: "Something went wrong. Please try again." }
}
