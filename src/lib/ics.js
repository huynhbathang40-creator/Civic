// Builds an RFC 5545 calendar file with all-day events and a reminder alarm.
const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")
const ymd = (iso) => iso.replaceAll("-", "")
const nextDay = (iso) => {
  const [y, m, d] = iso.split("-").map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + 1))
  return t.toISOString().slice(0, 10)
}
const stamp = () => new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "")

// Lines longer than 75 octets must be folded.
const fold = (line) => {
  const out = []
  let rest = line
  while (rest.length > 74) {
    out.push(rest.slice(0, 74))
    rest = " " + rest.slice(74)
  }
  out.push(rest)
  return out.join("\r\n")
}

export function buildIcs(events) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ballot Ready//Voter reminders//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"]
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}@ballotready`,
      `DTSTAMP:${stamp()}`,
      `DTSTART;VALUE=DATE:${ymd(e.date)}`,
      `DTEND;VALUE=DATE:${ymd(nextDay(e.endDate ?? e.date))}`,
      `SUMMARY:${esc(e.title)}`,
      ...(e.description ? [`DESCRIPTION:${esc(e.description)}`] : []),
      ...(e.url ? [`URL:${e.url}`] : []),
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(e.title)}`,
      "TRIGGER:-PT15H",
      "END:VALARM",
      "END:VEVENT",
    )
  }
  lines.push("END:VCALENDAR")
  return lines.map(fold).join("\r\n") + "\r\n"
}

export function downloadIcs(filename, events) {
  const blob = new Blob([buildIcs(events)], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
