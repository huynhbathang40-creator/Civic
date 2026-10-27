import { Link } from "../lib/router.jsx"
import { formatDate, relativeDays, titleCase } from "../lib/format.js"
import { load } from "../lib/storage.js"
import { Loading } from "./common.jsx"

function normalized(input) {
  if (!input) return null
  return [input.line1, input.city, [input.state, input.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")
}

export default function Overview({ address, elections, voter, districts, officials, setDemo }) {
  const v = voter.data
  const election = v?.election ?? elections.data?.elections?.[0] ?? null
  const measures = v?.contests.filter((c) => c.kind === "measure") ?? []
  const offices = v?.contests.filter((c) => c.kind === "office") ?? []
  const picks = election ? Object.keys(load(`picks:${election.id}`, {})).length : 0
  const nearest = v?.pollingLocations[0] ?? v?.earlyVoteSites[0] ?? null

  return (
    <>
      <section className="hero card" aria-labelledby="next-election">
        <p className="eyebrow">Next election</p>
        {elections.status === "loading" && !election ? (
          <Loading label="Finding upcoming elections…" />
        ) : election ? (
          <>
            <h1 id="next-election" tabIndex={-1}>{election.name}</h1>
            <p className="big-date">
              {formatDate(election.electionDay)} <span className="pill">{relativeDays(election.electionDay)}</span>
            </p>
          </>
        ) : (
          <h1 id="next-election" tabIndex={-1}>No upcoming elections listed yet</h1>
        )}
        <p className="muted">For {normalized(v?.normalizedInput ?? districts.data?.normalizedInput) ?? address}</p>
        {v?.mailOnly && <p className="note">This election is conducted by mail. Watch for your ballot in the mail.</p>}
        {voter.status === "error" && (
          <div className="note" role="status">
            <p>
              {voter.error.code === "no_election_data"
                ? "There's no detailed election data for your address yet. It usually appears a few weeks before Election Day. Your districts and officials are below."
                : voter.error.message}
            </p>
            <button className="secondary" onClick={() => setDemo(true)}>Explore with the test election</button>
          </div>
        )}
      </section>

      <div className="grid">
        <Card to="/vote" title="Where do I vote" icon="📍" loading={voter.status === "loading"}>
          {nearest ? (
            <>
              <strong>{titleCase(nearest.name) || "Nearest site"}</strong>
              <br />
              {titleCase(nearest.address)}
              {nearest.distanceMiles != null && ` · ${nearest.distanceMiles} mi`}
            </>
          ) : v ? (
            "No in-person sites listed for this address yet."
          ) : (
            "Polling places, early voting and drop boxes."
          )}
        </Card>
        <Card to="/ballot" title="Sample ballot" icon="🗳️" loading={voter.status === "loading"}>
          {v ? `${offices.length} contests, ${measures.length} measures${picks ? ` · ${picks} picks saved` : ""}` : "Every contest and measure on your ballot."}
        </Card>
        <Card to="/measures" title="Ballot measures explained" icon="📖" loading={voter.status === "loading"}>
          {v ? (measures.length ? `${measures.length} measures in plain language, also in Spanish and Vietnamese.` : "No ballot measures listed for this address.") : "Plain-language summaries of what Yes and No mean."}
        </Card>
        <Card to="/reminders" title="Reminders" icon="⏰">
          Add Election Day{v?.earlyVoting ? " and early voting" : ""} to your calendar, or turn on browser reminders.
        </Card>
        <Card to="/districts" title="Districts & officials" icon="🏛️" loading={districts.status === "loading"}>
          {districts.data
            ? `${districts.data.divisions.length} districts${officials.data ? ` · ${officials.data.officials.length} officials` : ""}`
            : districts.status === "error"
              ? districts.error.message
              : "Who represents you, from Congress to city council."}
        </Card>
        <Card to="/insights" title="Polling access insights" icon="📊">
          How many voters share each polling site, by county.
        </Card>
      </div>
    </>
  )
}

function Card({ to, title, icon, loading, children }) {
  return (
    <Link to={to} className="card feature">
      <span className="icon" aria-hidden="true">{icon}</span>
      <span>
        <span className="feature-title">{title}</span>
        <span className="feature-body">{loading ? "Loading…" : children}</span>
      </span>
      <span className="chev" aria-hidden="true">›</span>
    </Link>
  )
}
