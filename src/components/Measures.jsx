import { useState } from "react"
import { explainMeasure } from "../lib/api.js"
import { formatDate, titleCase } from "../lib/format.js"
import { load, save } from "../lib/storage.js"
import { Loading, NoElectionData, OfficialSources, PageHeader } from "./common.jsx"

const LANGS = [
  ["en", "English"],
  ["es", "Español"],
  ["vi", "Tiếng Việt"],
]

export default function Measures({ voter, setDemo }) {
  const v = voter.data
  const [lang, setLang] = useState(() => load("language", "en"))

  if (!v) return (<><PageHeader title="Ballot measures explained" /><NoElectionData voter={voter} setDemo={setDemo} /></>)
  const measures = v.contests.filter((c) => c.kind === "measure")

  return (
    <>
      <PageHeader title="Ballot measures explained">
        <p className="muted">{v.election?.name} · {formatDate(v.election?.electionDay)}</p>
      </PageHeader>
      <div className="note">
        <p>
          <strong>About these summaries:</strong> they are written by AI from the official ballot text, to help you
          read it. They can contain mistakes and are not an endorsement. The official text is always shown, and it is
          what you vote on.
        </p>
        <OfficialSources offices={v.electionOffices} />
      </div>

      <div className="lang-select">
        <label htmlFor="lang">Summary language</label>
        <select
          id="lang"
          value={lang}
          onChange={(e) => {
            setLang(e.target.value)
            save("language", e.target.value)
          }}
        >
          {LANGS.map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
      </div>

      {measures.length === 0 ? (
        <p className="note">No ballot measures are listed for your address.</p>
      ) : (
        measures.map((c, i) => <MeasureCard key={`${i}-${c.title}`} c={c} lang={lang} />)
      )}
    </>
  )
}

function MeasureCard({ c, lang }) {
  const m = c.measure
  const [state, setState] = useState({}) // keyed by language
  const current = state[lang]
  const text = [m.subtitle, m.text, m.brief].filter(Boolean).join("\n\n")

  const explain = async () => {
    setState((s) => ({ ...s, [lang]: { status: "loading" } }))
    try {
      const data = await explainMeasure(m.title ?? c.title, text, lang)
      setState((s) => ({ ...s, [lang]: { status: "ready", data } }))
    } catch (error) {
      setState((s) => ({ ...s, [lang]: { status: "error", error } }))
    }
  }

  return (
    <article className="card measure" aria-labelledby={`m-${c.title}`}>
      <h2 id={`m-${c.title}`}>{titleCase(m.title ?? c.title)}</h2>
      {c.district && <p className="muted">{titleCase(c.district)}{m.threshold ? ` · Passes with: ${m.threshold.toLowerCase()}` : ""}</p>}

      <section className="explainer" aria-live="polite">
        {!current && text.length >= 20 && (
          <button className="primary" onClick={explain}>
            Explain in plain language{lang !== "en" ? ` (${LANGS.find(([k]) => k === lang)[1]})` : ""}
          </button>
        )}
        {text.length < 20 && <p className="muted">No official text is available to summarize.</p>}
        {current?.status === "loading" && <Loading label="Writing a plain-language summary…" />}
        {current?.status === "error" && (
          <div className="note warn" role="alert">
            <p>{current.error.message}</p>
            <button className="secondary" onClick={explain}>Try again</button>
          </div>
        )}
        {current?.status === "ready" && (
          <div lang={lang}>
            <p className="ai-label">AI-generated summary · check the official text</p>
            <p>{current.data.summary}</p>
            <div className="grid two yes-no-explained">
              <div className="card yes"><h3>A YES vote means</h3><p>{current.data.yesMeans}</p></div>
              <div className="card no"><h3>A NO vote means</h3><p>{current.data.noMeans}</p></div>
            </div>
            {current.data.keyPoints.length > 0 && (
              <ul>{current.data.keyPoints.map((k) => <li key={k}>{k}</li>)}</ul>
            )}
          </div>
        )}
      </section>

      <details open={!current || current.status !== "ready"}>
        <summary>Official ballot text</summary>
        {m.subtitle && <p><strong>{m.subtitle}</strong></p>}
        {m.text && <p className="measure-text">{m.text}</p>}
        {m.brief && <p className="measure-text">{m.brief}</p>}
        {m.pro && <><h3>Argument in favor (official)</h3><p className="measure-text">{m.pro}</p></>}
        {m.con && <><h3>Argument against (official)</h3><p className="measure-text">{m.con}</p></>}
        {m.url && <p><a href={m.url} target="_blank" rel="noopener noreferrer">Full measure text</a></p>}
      </details>
    </article>
  )
}
