import { useEffect, useState } from "react"
import { formatDate, titleCase } from "../lib/format.js"
import { load, save } from "../lib/storage.js"
import { Link } from "../lib/router.jsx"
import { NoElectionData, OfficialSources, PageHeader } from "./common.jsx"

const contestKey = (c, i) => `${i}:${c.title}`

const CHANNEL_URLS = {
  Facebook: (id) => (id.startsWith("http") ? id : `https://www.facebook.com/${id}`),
  Twitter: (id) => (id.startsWith("http") ? id : `https://x.com/${id}`),
  YouTube: (id) => (id.startsWith("http") ? id : `https://www.youtube.com/${id}`),
}

export default function SampleBallot({ voter, setDemo }) {
  const v = voter.data
  const storageKey = v?.election ? `picks:${v.election.id}` : null
  const [picks, setPicks] = useState({})

  useEffect(() => {
    if (storageKey) setPicks(load(storageKey, {}))
  }, [storageKey])

  const update = (key, value) => {
    const next = { ...picks }
    if (value == null || (Array.isArray(value) && !value.length)) delete next[key]
    else next[key] = value
    setPicks(next)
    save(storageKey, next)
  }

  if (!v) return (<><PageHeader title="Sample ballot" /><NoElectionData voter={voter} setDemo={setDemo} /></>)

  const contests = v.contests
  const picked = Object.keys(picks).length

  return (
    <>
      <PageHeader title="Your sample ballot">
        <p className="muted">
          {v.election?.name} · {formatDate(v.election?.electionDay)}
        </p>
        <p>
          Mark your choices to take with you. They're saved only in this browser. This is not an official ballot and
          nothing here is submitted anywhere.
        </p>
        <div className="actions no-print">
          <button className="primary" onClick={() => print()}>Print or save as PDF</button>
          {picked > 0 && (
            <button className="secondary" onClick={() => confirm("Clear all your picks?") && (setPicks({}), save(storageKey, {}))}>
              Clear picks ({picked})
            </button>
          )}
        </div>
      </PageHeader>

      {contests.length === 0 ? (
        <div className="note">
          <p>No contests are listed for this address yet.</p>
          <OfficialSources offices={v.electionOffices} />
        </div>
      ) : (
        <ol className="ballot">
          {contests.map((c, i) => {
            const key = contestKey(c, i)
            return (
              <li key={key} className="card contest">
                {c.kind === "measure" ? (
                  <MeasureContest c={c} value={picks[key]} onChange={(val) => update(key, val)} name={key} />
                ) : (
                  <OfficeContest c={c} value={picks[key] ?? []} onChange={(val) => update(key, val)} name={key} />
                )}
              </li>
            )
          })}
        </ol>
      )}
      <p className="muted">
        Candidates are listed in the order provided by official election data. <OfficialSources offices={v.electionOffices} />
      </p>
    </>
  )
}

function OfficeContest({ c, value, onChange, name }) {
  const max = c.numberVotingFor ?? 1
  const multi = max > 1
  const toggle = (candidate, checked) => {
    if (!multi) return onChange(checked ? [candidate] : [])
    const next = checked ? [...value, candidate] : value.filter((n) => n !== candidate)
    onChange(next.slice(0, max))
  }
  return (
    <fieldset>
      <legend>
        <span className="contest-title">{titleCase(c.title)}</span>
        {c.district && <span className="muted"> · {titleCase(c.district)}</span>}
        <span className="vote-for">Vote for {max}</span>
      </legend>
      {c.candidates.length === 0 && <p className="muted">No candidates listed.</p>}
      <ul className="candidates">
        {c.candidates.map((p, i) => {
          const id = `${name}-${i}`
          const checked = value.includes(p.name)
          return (
            <li key={id}>
              <label htmlFor={id} className="choice">
                <input
                  id={id}
                  type={multi ? "checkbox" : "radio"}
                  name={name}
                  checked={checked}
                  disabled={multi && !checked && value.length >= max}
                  onChange={(e) => toggle(p.name, e.target.checked)}
                />
                <span>
                  <strong>{titleCase(p.name)}</strong>
                  {p.party && <span className="muted"> · {p.party}</span>}
                </span>
              </label>
              <CandidateLinks p={p} />
            </li>
          )
        })}
      </ul>
      <ClearChoice show={value.length > 0} onClear={() => onChange([])} />
    </fieldset>
  )
}

function ClearChoice({ show, onClear }) {
  if (!show) return null
  return (
    <button type="button" className="link-button no-print" onClick={onClear}>
      Clear choice
    </button>
  )
}

function CandidateLinks({ p }) {
  const links = [
    p.url && [p.url, "Website"],
    ...p.channels.filter((ch) => CHANNEL_URLS[ch.type]).map((ch) => [CHANNEL_URLS[ch.type](ch.id), ch.type]),
  ].filter(Boolean)
  if (!links.length && !p.email && !p.phone) return null
  return (
    <p className="candidate-links no-print">
      {links.map(([url, label]) => (
        <a key={url} href={url} target="_blank" rel="noopener noreferrer">
          {label}<span className="sr-only"> for {p.name}</span>
        </a>
      ))}
      {p.email && <a href={`mailto:${p.email}`}>Email</a>}
      {p.phone && <a href={`tel:${p.phone}`}>{p.phone}</a>}
    </p>
  )
}

function MeasureContest({ c, value, onChange, name }) {
  const m = c.measure
  return (
    <fieldset>
      <legend>
        <span className="contest-title">{titleCase(m.title ?? c.title)}</span>
        {c.district && <span className="muted"> · {titleCase(c.district)}</span>}
      </legend>
      {m.subtitle && <p>{m.subtitle}</p>}
      {m.text && <p className="measure-text">{m.text.length > 400 ? `${m.text.slice(0, 400)}…` : m.text}</p>}
      <p className="no-print">
        <Link to="/measures">Read the plain-language explanation</Link>
      </p>
      <div className="yes-no">
        {m.responses.map((r, i) => {
          const id = `${name}-${i}`
          return (
            <label key={id} htmlFor={id} className="choice">
              <input
                id={id}
                type="radio"
                name={name}
                checked={value === r}
                onChange={() => onChange(r)}
              />
              <strong>{titleCase(r)}</strong>
            </label>
          )
        })}
      </div>
      <ClearChoice show={Boolean(value)} onClear={() => onChange(null)} />
    </fieldset>
  )
}
