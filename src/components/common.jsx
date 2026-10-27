import { Link } from "../lib/router.jsx"

export function Loading({ label = "Loading…" }) {
  return (
    <p className="loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" /> {label}
    </p>
  )
}

export function ErrorNote({ error, children }) {
  return (
    <div className="note warn" role="alert">
      <p>{error?.message ?? "Something went wrong."}</p>
      {children}
    </div>
  )
}

// Shown whenever voter info is unavailable for the address (off-season,
// unsupported area, or a lookup error).
export function NoElectionData({ voter, setDemo }) {
  if (voter.status === "loading" || voter.status === "idle") return <Loading label="Looking up your election…" />
  const offSeason = voter.error?.code === "no_election_data"
  return (
    <div className="note" role="status">
      <h2>{offSeason ? "No upcoming election data yet" : "We couldn't load election data"}</h2>
      <p>
        {offSeason
          ? "Election details usually appear a few weeks before an election, and coverage varies by state and county."
          : voter.error?.message}
      </p>
      <p>
        Meanwhile you can see <Link to="/districts">your districts and officials</Link> or{" "}
        <Link to="/reminders">set up reminders</Link>.
      </p>
      {setDemo && (
        <button className="secondary" onClick={() => setDemo(true)}>
          Explore with the test election
        </button>
      )}
    </div>
  )
}

export function PageHeader({ title, children }) {
  return (
    <div className="page-header">
      <h1 tabIndex={-1}>{title}</h1>
      {children}
    </div>
  )
}

export function OfficialSources({ offices }) {
  const office = offices?.[1] ?? offices?.[0]
  const url = office?.infoUrl ?? offices?.[0]?.infoUrl
  if (!url) return null
  return (
    <p className="muted">
      Official source:{" "}
      <a href={url} target="_blank" rel="noopener noreferrer">
        {office?.office ?? "Election office"}
        {office?.name ? ` (${office.name})` : ""}
      </a>
    </p>
  )
}
