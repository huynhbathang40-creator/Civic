const parseDay = (iso) => {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function formatDate(iso, opts = { weekday: "long", month: "long", day: "numeric", year: "numeric" }) {
  if (!iso) return ""
  return parseDay(iso).toLocaleDateString("en-US", opts)
}

export function daysUntil(iso) {
  if (!iso) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((parseDay(iso) - today) / 86400000)
}

export function relativeDays(iso) {
  const n = daysUntil(iso)
  if (n == null) return ""
  if (n === 0) return "Today"
  if (n === 1) return "Tomorrow"
  if (n > 1) return `In ${n} days`
  if (n === -1) return "Yesterday"
  return `${-n} days ago`
}

export const directionsUrl = (address) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`

// Official data is often ALL CAPS; soften it but keep state codes ("CA 90291").
export const titleCase = (s) =>
  s && s === s.toUpperCase()
    ? s
        .toLowerCase()
        .replace(/\b([a-z])/g, (c) => c.toUpperCase())
        .replace(/\b([A-Z][a-z])(?= \d{5}\b)/g, (c) => c.toUpperCase())
    : s
