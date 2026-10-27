import { useEffect, useRef } from "react"
import L from "leaflet"

export const KINDS = {
  polling: { label: "Polling place", color: "#1f5fbf" },
  early: { label: "Early voting", color: "#0f7a4a" },
  dropoff: { label: "Ballot drop-off", color: "#b8560b" },
}

// CARTO basemaps (OpenStreetMap data) need no API key, so no key reaches the
// browser. If tiles keep failing we switch to the next provider. The list next
// to the map carries the same information for keyboard and screen-reader users.
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
const PROVIDERS = [
  (dark) => ({
    url: `https://{s}.basemaps.cartocdn.com/${dark ? "dark_all" : "rastertiles/voyager"}/{z}/{x}/{y}{r}.png`,
    options: { subdomains: "abcd", maxZoom: 20, attribution: `${ATTRIBUTION} &copy; <a href="https://carto.com/attributions">CARTO</a>` },
  }),
  () => ({
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: { maxZoom: 19, attribution: ATTRIBUTION },
  }),
]

function addTiles(map, dark, index = 0) {
  const { url, options } = PROVIDERS[index](dark)
  const tiles = L.tileLayer(url, options)
  let errors = 0
  tiles.on("tileerror", () => {
    errors += 1
    if (errors === 4 && index + 1 < PROVIDERS.length) {
      map.removeLayer(tiles)
      addTiles(map, dark, index + 1)
    }
  })
  return tiles.addTo(map)
}

export default function SiteMap({ origin, originApproximate, sites, selected, onSelect }) {
  const el = useRef(null)
  const map = useRef(null)
  const layer = useRef(null)
  const markers = useRef(new Map())

  useEffect(() => {
    map.current = L.map(el.current, { scrollWheelZoom: false, keyboard: false })
    addTiles(map.current, matchMedia("(prefers-color-scheme: dark)").matches)
    layer.current = L.layerGroup().addTo(map.current)
    return () => map.current.remove()
  }, [])

  useEffect(() => {
    layer.current.clearLayers()
    markers.current.clear()
    const points = []
    if (origin && !originApproximate) {
      L.circleMarker([origin.lat, origin.lng], { radius: 7, color: "#111", weight: 3, fillColor: "#fff", fillOpacity: 1 })
        .bindTooltip("Your address")
        .addTo(layer.current)
      points.push([origin.lat, origin.lng])
    }
    for (const s of sites) {
      if (s.lat == null) continue
      const m = L.circleMarker([s.lat, s.lng], {
        radius: 9,
        color: "#fff",
        weight: 2,
        fillColor: KINDS[s.kind].color,
        fillOpacity: 0.95,
      })
        .bindTooltip(`${KINDS[s.kind].label}: ${s.name || s.address}`)
        .on("click", () => onSelect(s.key))
        .addTo(layer.current)
      markers.current.set(s.key, m)
      points.push([s.lat, s.lng])
    }
    if (points.length === 1) map.current.setView(points[0], 14)
    else if (points.length) map.current.fitBounds(points, { padding: [30, 30], maxZoom: 15 })
    else map.current.setView([39.8, -98.6], 4)
  }, [origin, originApproximate, sites])

  useEffect(() => {
    const m = selected && markers.current.get(selected)
    if (m) {
      el.current.scrollIntoView({ behavior: "smooth", block: "center" })
      map.current.setView(m.getLatLng(), Math.max(map.current.getZoom(), 15))
      m.openTooltip()
    }
  }, [selected])

  return <div ref={el} className="map" role="img" aria-label="Map of voting locations near your address. The same locations are listed below." />
}
