import { useState } from "react"
import { useAsync } from "../lib/useAsync.js"
import { formatDate } from "../lib/format.js"
import { ErrorNote, Loading, PageHeader } from "./common.jsx"

const METRICS = {
  inPerson: { label: "In-person voting sites", value: (r) => r.pollingSites + r.earlyVoteSites, fmt: (n) => n.toLocaleString() },
  dropOff: { label: "Ballot drop-off sites", value: (r) => r.dropOffSites, fmt: (n) => n.toLocaleString() },
  votersPerSite: { label: "Eligible voters per in-person site", value: (r) => r.votersPerSite, fmt: (n) => n.toLocaleString() },
}

const loadInsights = () =>
  fetch("/data/insights.json").then((r) => {
    if (!r.ok) throw new Error("Insights data is not available right now.")
    return r.json()
  })

export default function Insights() {
  const data = useAsync(loadInsights, [])
  const [metric, setMetric] = useState("inPerson")
  const d = data.data

  return (
    <>
      <PageHeader title="Polling access insights">
        <p>How many places to vote each county offers, and how many eligible voters share each one.</p>
      </PageHeader>

      {data.status === "loading" && <Loading />}
      {data.status === "error" && <ErrorNote error={data.error} />}
      {d && !d.counties?.length && <p className="note">Insights are generated at deploy time and aren't available yet.</p>}

      {d?.counties?.length > 0 && (
        <>
          <p className="muted">
            {d.election.name} ({formatDate(d.election.electionDay)}) · updated {new Date(d.generatedAt).toLocaleDateString("en-US")}
          </p>
          <div className="segmented" role="radiogroup" aria-label="Metric">
            {Object.entries(METRICS).map(([key, m]) => (
              <label key={key}>
                <input type="radio" name="metric" value={key} checked={metric === key} onChange={() => setMetric(key)} />
                <span>{m.label}</span>
              </label>
            ))}
          </div>
          <BarChart rows={d.counties} metric={METRICS[metric]} />
          <DataTable rows={d.counties} />
          <details>
            <summary>How this is calculated</summary>
            <p>{d.method}</p>
            <p>
              Counties that rely on vote-by-mail or assign voters to a single precinct list fewer sites for a sample
              address, so compare counties within the same state where possible. Counties with no listed sites are
              shown as "no data".
            </p>
          </details>
        </>
      )}
    </>
  )
}

function BarChart({ rows, metric }) {
  const items = rows
    .map((r) => ({ name: `${r.county}, ${r.state}`, value: r.hasData ? metric.value(r) : null }))
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
  const max = Math.max(1, ...items.map((i) => i.value ?? 0))
  const missing = items.every((i) => i.value == null)

  return (
    <figure className="card chart">
      <figcaption>{metric.label} by county</figcaption>
      {missing ? (
        <p className="muted">Not available in this data snapshot (Census population data is added at deploy time).</p>
      ) : (
        <ul className="bars" aria-hidden="true">
          {items.map((i) => (
            <li key={i.name}>
              <span className="bar-label">{i.name}</span>
              <span className="bar-track">
                {i.value != null && <span className="bar" style={{ width: `${Math.max(1, (i.value / max) * 100)}%` }} />}
              </span>
              <span className="bar-value">{i.value == null ? "no data" : metric.fmt(i.value)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="sr-only">The same values are in the table below.</p>
    </figure>
  )
}

function DataTable({ rows }) {
  const n = (v) => (v == null ? "—" : v.toLocaleString())
  return (
    <div className="table-scroll" tabIndex={0} role="region" aria-label="County data table">
      <table>
        <thead>
          <tr>
            <th scope="col">County</th>
            <th scope="col">Polling places</th>
            <th scope="col">Early vote sites</th>
            <th scope="col">Drop-off sites</th>
            <th scope="col">Eligible voters</th>
            <th scope="col">Voters per in-person site</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.fips}>
              <th scope="row">{r.county}, {r.state}</th>
              <td>{r.hasData ? n(r.pollingSites) : "no data"}</td>
              <td>{r.hasData ? n(r.earlyVoteSites) : "—"}</td>
              <td>{r.hasData ? n(r.dropOffSites) : "—"}</td>
              <td>{n(r.votingAgeCitizens)}</td>
              <td>{n(r.votersPerSite)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
