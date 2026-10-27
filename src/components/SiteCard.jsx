import { directionsUrl, formatDate, titleCase } from "../lib/format.js"
import { dayStatus, groupDays, parseHours } from "../lib/hours.js"

const short = (iso) => formatDate(iso, { month: "short", day: "numeric" })
const withDay = (iso) => formatDate(iso, { weekday: "short", month: "short", day: "numeric" })
const range = (g) => (g.from === g.to ? withDay(g.from) : `${short(g.from)} – ${short(g.to)}`)

function StatusBadge({ status, kind }) {
  if (status.kind === "today") return <span className="badge open">Open today · {status.hours}</span>
  if (status.kind === "later" && kind === "polling") return <span className="badge later">Election Day</span>
  if (status.kind === "later") return <span className="badge later">Opens {withDay(status.date)}</span>
  return <span className="badge closed">Closed for this election</span>
}

export default function SiteCard({ site, kind, year, distanceLabel, selected, onShow }) {
  const days = parseHours(site.hours, year)
  const groups = days ? groupDays(days) : null
  const status = days ? dayStatus(days) : null
  const title = titleCase(site.name) || titleCase(site.address)

  return (
    <li className={`card site${selected ? " selected" : ""}${status?.kind === "ended" ? " past" : ""}`}>
      <div className="site-main">
        <h3>{title}</h3>
        {site.name && <p className="site-address">{titleCase(site.address)}</p>}

        <div className="site-meta">
          {status && <StatusBadge status={status} kind={kind} />}
          {distanceLabel && <span className="meta">{distanceLabel}</span>}
        </div>

        {groups ? (
          <dl className="schedule">
            {groups.slice(0, 3).map((g) => (
              <div key={g.from}>
                <dt>{range(g)}</dt>
                <dd>{g.hours}</dd>
              </div>
            ))}
          </dl>
        ) : (
          site.hours && <p className="schedule-raw">{site.hours}</p>
        )}
        {groups && groups.length > 3 && (
          <details className="all-days">
            <summary>All {days.length} days</summary>
            <dl className="schedule">
              {groups.map((g) => (
                <div key={g.from}>
                  <dt>{range(g)}</dt>
                  <dd>{g.hours}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}
        {!site.hours && kind !== "polling" && (site.startDate || site.endDate) && (
          <p className="schedule-raw">
            {site.startDate && site.endDate && site.startDate !== site.endDate
              ? `${short(site.startDate)} – ${short(site.endDate)}`
              : withDay(site.startDate ?? site.endDate)}
          </p>
        )}
        {site.notes && <p className="site-notes">{site.notes}</p>}
      </div>

      <div className="site-actions">
        <a className="button primary" href={directionsUrl(site.address)} target="_blank" rel="noopener noreferrer">
          Directions<span className="sr-only"> to {title} (opens Google Maps)</span>
        </a>
        {site.lat != null && (
          <button className="secondary" onClick={onShow}>
            Show on map<span className="sr-only">: {title}</span>
          </button>
        )}
      </div>
    </li>
  )
}
