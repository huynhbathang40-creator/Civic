// Free US Census geocoder (no key). Best effort: used only to sort sites by
// distance, so any failure just returns null.
export async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress")
  url.searchParams.set("address", address)
  url.searchParams.set("benchmark", "Public_AR_Current")
  url.searchParams.set("format", "json")
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) })
    if (!res.ok) return null
    const data = await res.json()
    const c = data?.result?.addressMatches?.[0]?.coordinates
    return c ? { lat: c.y, lng: c.x } : null
  } catch {
    return null
  }
}

export function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 3958.8 * 2 * Math.asin(Math.sqrt(h))
}
