import { Loading, ErrorNote, PageHeader } from "./common.jsx"

const LEVELS = ["Federal", "State", "County", "City", "Local"]

export default function Districts({ districts, officials }) {
  const d = districts.data
  const o = officials.data

  return (
    <>
      <PageHeader title="Your districts & officials">
        <p>Every district your address belongs to, and the people who represent you.</p>
      </PageHeader>

      {districts.status === "loading" && <Loading label="Finding your districts…" />}
      {districts.status === "error" && <ErrorNote error={districts.error} />}

      {d && (
        <section aria-labelledby="h-officials">
          <h2 id="h-officials">Elected officials</h2>
          {officials.status === "loading" && <Loading label="Loading officials…" />}
          {officials.status === "error" && <ErrorNote error={officials.error} />}
          {o && (
            <>
              {o.officials.length === 0 && <p className="muted">No officials found for these districts.</p>}
              <ul className="grid two officials">
                {o.officials.map((p) => (
                  <li key={`${p.office}-${p.name}`} className="card official">
                    <p className="eyebrow">{p.level}</p>
                    <h3>{p.name}</h3>
                    <p>{p.office}{p.party ? ` · ${p.party}` : ""}</p>
                    <p className="contact">
                      {p.phone && <a href={`tel:${p.phone}`}>{p.phone}</a>}
                      {p.email && <a href={`mailto:${p.email}`}>Email</a>}
                      {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer">Website</a>}
                      {p.contactUrl && p.contactUrl !== p.url && (
                        <a href={p.contactUrl} target="_blank" rel="noopener noreferrer">Contact</a>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
              {o.notes.map((n) => <p key={n} className="note">{n}</p>)}
              <p className="muted">
                Sources: {o.sources.join(", ")}. Officials data comes from open datasets and may lag recent changes.
                County and city officials aren't covered yet; check your local government's website.
              </p>
            </>
          )}
        </section>
      )}

      {d && (
        <section aria-labelledby="h-districts">
          <h2 id="h-districts">Your districts</h2>
          {LEVELS.map((level) => {
            const items = d.divisions.filter((x) => x.level === level)
            if (!items.length) return null
            return (
              <div key={level} className="district-group">
                <h3>{level}</h3>
                <ul className="districts">
                  {items.map((x) => (
                    <li key={x.id}>
                      {x.name}
                      <code className="ocd">{x.id.replace("ocd-division/", "")}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
          <p className="muted">District IDs are Open Civic Data identifiers, from the Google Civic Information API.</p>
        </section>
      )}
    </>
  )
}
