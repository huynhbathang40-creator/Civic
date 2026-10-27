// Civic API hours arrive as one line per day, e.g.
// "Mon, Oct 19: 7 am - 7 pm\nTue, Oct 20: 7 am - 7 pm". Parse them so the UI
// can show compact ranges ("Oct 19 – Nov 1 · 7 am – 7 pm") and today's status.
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
const LINE = /^\s*(?:[A-Za-z]{3,9},?\s+)?([A-Za-z]{3,9})\.?\s+(\d{1,2})\s*:\s*(.+?)\s*$/

const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`

// "8:30 am - 5:00 pm" -> "8:30 am – 5 pm"
export const tidyTime = (s) =>
  s.replace(/:00(?=\s*[ap]\.?m)/gi, "").replace(/\s*-\s*/g, " – ").replace(/\s+/g, " ").trim()

export function parseHours(raw, year) {
  if (!raw) return null
  const lines = raw.split(/\n|;/).map((l) => l.trim()).filter(Boolean)
  const days = []
  let y = year
  let lastMonth = null
  for (const line of lines) {
    const m = line.match(LINE)
    const month = m && MONTHS.indexOf(m[1].slice(0, 3).toLowerCase())
    if (!m || month < 0) return null
    if (lastMonth != null && month < lastMonth) y += 1 // e.g. Dec -> Jan
    lastMonth = month
    days.push({ date: iso(y, month, Number(m[2])), hours: tidyTime(m[3]) })
  }
  return days.length ? days : null
}

const nextDate = (d) => {
  const [y, m, day] = d.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, day + 1)).toISOString().slice(0, 10)
}

// Consecutive days with identical hours collapse into one range.
export function groupDays(days) {
  const groups = []
  for (const d of days) {
    const g = groups[groups.length - 1]
    if (g && g.hours === d.hours && nextDate(g.to) === d.date) g.to = d.date
    else groups.push({ from: d.date, to: d.date, hours: d.hours })
  }
  return groups
}

export const todayIso = () => {
  const t = new Date()
  return iso(t.getFullYear(), t.getMonth(), t.getDate())
}

export function dayStatus(days, today = todayIso()) {
  const now = days.find((d) => d.date === today)
  if (now) return { kind: "today", hours: now.hours }
  const next = days.find((d) => d.date > today)
  if (next) return { kind: "later", date: next.date, hours: next.hours }
  return { kind: "ended" }
}
