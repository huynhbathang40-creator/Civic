import { useMemo, useState } from "react"
import { directionsUrl, formatDate, titleCase } from "../lib/format.js"
import SiteMap, { KINDS } from "./SiteMap.jsx"
import { NoElectionData, OfficialSources, PageHeader } from "./common.jsx"

const GROUPS = [
  ["polling", "pollingLocations", "Polling places"],
  ["early", "earlyVoteSites", "Early voting sites"],
  ["dropoff", "dropOffLocations", "Ballot drop-off locations"],
]

export default function WhereToVote({ voter, setDemo }) {
  const v = voter.data
  const [show, setShow] = useState({ polling: true, early: true, dropoff: true })
  const [selected, setSelected] = useState(null)

  const all = useMemo(
    () =>
      v
        ? GROUPS.flatMap(([kind, field]) => v[field].map((s, i) => ({ ...s, kind, key: `${kind}-${i}` })))
        : [],
    [v],
  )
  const visible = useMemo(() => all.filter((s) => show[s.kind]), [all, show])

  if (!v) return (<><PageHeader title="Where do I vote" /><NoElectionData voter={voter} setDemo={setDemo} /></>)

  return (
    <>
      <PageHeader title="Where do I vote">
        <p className="muted">{v.election?.name} · {formatDate(v.election?.electionDay)}</p>
      </PageHeader>

      {v.mailOnly && <p className="note">This election is conducted by mail. Return your ballot by mail or at a drop-off location.</p>}

      {all.length === 0 ? (
        <div className="note">
          <p>No voting locations are listed for this address yet. Check with your election office:</p>
          <OfficialSources offices={v.electionOffices} />
        </div>
      ) : (
        <>
          <fieldset className="filters">
            <legend className="sr-only">Show on map</legend>
            {GROUPS.map(([kind, field]) =>
              v[field].length ? (
                <label key={kind} className="chip" style={{ "--chip": KINDS[kind].color }}>
                  <input type="checkbox" checked={show[kind]} onChange={(e) => setShow({ ...show, [kind]: e.target.checked })} />
                  <span className="dot" aria-hidden="true" />
                  {KINDS[kind].label} ({v.counts[field] > v[field].length ? `${v[field].length} of ${v.counts[field]}` : v[field].length})
                </label>
              ) : null,
            )}
          </fieldset>
          <SiteMap origin={v.origin} sites={visible} selected={selected} onSelect={setSelected} />

          {GROUPS.map(([kind, field, heading]) =>
            show[kind] && v[field].length ? (
              <section key={kind} aria-labelledby={`h-${kind}`}>
                <h2 id={`h-${kind}`}>{heading}</h2>
                {v.counts[field] > v[field].length && (
                  <p className="muted">Showing the {v[field].length} {v.origin ? "nearest" : "first"} of {v.counts[field]} locations.</p>
                )}
                <ul className="sites">
                  {all.filter((s) => s.kind === kind).map((s) => (
                    <li key={s.key} className={`card site${selected === s.key ? " selected" : ""}`}>
                      <div>
                        <h3>{titleCase(s.name) || titleCase(s.address)}</h3>
                        <p>{titleCase(s.address)}</p>
                        {s.distanceMiles != null && <p className="muted">{s.distanceMiles} miles away</p>}
                        {s.hours && <p><strong>Hours:</strong> {s.hours}</p>}
                        {(s.startDate || s.endDate) && kind !== "polling" && (
                          <p>
                            <strong>Open:</strong> {formatDate(s.startDate, { month: "short", day: "numeric" })}
                            {s.endDate && s.endDate !== s.startDate ? ` – ${formatDate(s.endDate, { month: "short", day: "numeric" })}` : ""}
                          </p>
                        )}
                        {s.notes && <p className="muted">{s.notes}</p>}
                      </div>
                      <div className="site-actions">
                        <a className="button primary" href={directionsUrl(s.address)} target="_blank" rel="noopener noreferrer">
                          Directions<span className="sr-only"> to {s.name || s.address} (opens Google Maps)</span>
                        </a>
                        {s.lat != null && (
                          <button className="secondary" onClick={() => setSelected(s.key)}>
                            Show on map
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null,
          )}
        </>
      )}

      <ElectionOffices offices={v.electionOffices} />
    </>
  )
}

function ElectionOffices({ offices }) {
  if (!offices?.length) return null
  return (
    <section aria-labelledby="h-offices">
      <h2 id="h-offices">Election offices</h2>
      <div className="grid two">
        {offices.map((o, i) => (
          <div key={i} className="card">
            <h3>{o.name}{o.office ? ` – ${o.office}` : ""}</h3>
            {o.address && <p>{o.address}</p>}
            {o.officials.map((p, j) => (
              <p key={j}>
                {[p.title, p.name].filter(Boolean).join(": ")}
                {p.phone && <> · <a href={`tel:${p.phone}`}>{p.phone}</a></>}
                {p.email && <> · <a href={`mailto:${p.email}`}>{p.email}</a></>}
              </p>
            ))}
            <ul className="links">
              {[
                [o.infoUrl, "Election information"],
                [o.registrationCheckUrl, "Check your registration"],
                [o.registrationUrl, "Register to vote"],
                [o.absenteeUrl, "Vote by mail / absentee"],
                [o.locationFinderUrl, "Official polling place lookup"],
              ]
                .filter(([url]) => url)
                .map(([url, label]) => (
                  <li key={label}>
                    <a href={url} target="_blank" rel="noopener noreferrer">{label}</a>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
