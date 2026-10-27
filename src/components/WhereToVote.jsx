import { useMemo, useState } from "react"
import { formatDate } from "../lib/format.js"
import SiteMap, { KINDS } from "./SiteMap.jsx"
import SiteCard from "./SiteCard.jsx"
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

  const year = Number(v?.election?.electionDay?.slice(0, 4)) || new Date().getFullYear()

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
          <SiteMap origin={v.origin} originApproximate={v.originApproximate} sites={visible} selected={selected} onSelect={setSelected} />

          {GROUPS.map(([kind, field, heading]) =>
            show[kind] && v[field].length ? (
              <section key={kind} aria-labelledby={`h-${kind}`}>
                <h2 id={`h-${kind}`}>{heading}</h2>
                {v.counts[field] > v[field].length && (
                  <p className="muted">Showing the {v[field].length} {v.origin ? "nearest" : "first"} of {v.counts[field]} locations.</p>
                )}
                <ul className="sites">
                  {all.filter((s) => s.kind === kind).map((s) => (
                    <SiteCard
                      key={s.key}
                      site={s}
                      kind={kind}
                      year={year}
                      selected={selected === s.key}
                      onShow={() => setSelected(s.key)}
                      distanceLabel={
                        s.distanceMiles != null && !(v.originApproximate && kind === "polling")
                          ? `${s.distanceMiles} mi ${v.originApproximate ? "from your polling place" : "away"}`
                          : null
                      }
                    />
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
