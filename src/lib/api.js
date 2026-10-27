// Calls go to our own Netlify Functions, which hold the API keys. Addresses
// are sent in POST bodies so they never appear in URLs or access logs.
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request(path, body) {
  let res
  try {
    res = await fetch(path, body === undefined
      ? {}
      : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  } catch {
    throw new ApiError(0, "offline", "You appear to be offline. Check your connection and try again.")
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 429 && !data?.error)
      throw new ApiError(429, "rate_limited", "Too many requests right now. Please try again in a minute.")
    throw new ApiError(res.status, data?.error?.code ?? "error", data?.error?.message ?? "Something went wrong. Please try again.")
  }
  return data
}

export const getElections = (includeTest = false) => request(`/api/elections${includeTest ? "?test=1" : ""}`)
export const getVoterInfo = (address, electionId) => request("/api/voterinfo", { address, electionId })
export const getDistricts = (address) => request("/api/districts", { address })
export const getOfficials = (divisions) => request("/api/officials", { divisions })
export const explainMeasure = (title, text, language) => request("/api/explain", { title, text, language })
