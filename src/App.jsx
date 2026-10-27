import { useEffect, useRef, useState } from "react"
import { getDistricts, getElections, getOfficials, getVoterInfo } from "./lib/api.js"
import { clearAll, load, save } from "./lib/storage.js"
import { useAsync } from "./lib/useAsync.js"
import { Link, ROUTES, navigate, usePath } from "./lib/router.jsx"
import { useElectionNotifications } from "./lib/notify.js"
import AddressForm from "./components/AddressForm.jsx"
import Overview from "./components/Overview.jsx"
import WhereToVote from "./components/WhereToVote.jsx"
import SampleBallot from "./components/SampleBallot.jsx"
import Measures from "./components/Measures.jsx"
import Reminders from "./components/Reminders.jsx"
import Districts from "./components/Districts.jsx"
import Insights from "./components/Insights.jsx"

export const DEMO_ELECTION_ID = "2000"

export default function App() {
  const path = usePath()
  const [address, setAddress] = useState(() => load("address"))
  const [demo, setDemo] = useState(() => load("demo", false))
  const mainRef = useRef(null)

  const electionId = demo ? DEMO_ELECTION_ID : undefined
  const elections = useAsync(() => getElections(demo), [demo])
  const voter = useAsync(() => (address ? getVoterInfo(address, electionId) : null), [address, electionId])
  const districts = useAsync(() => (address ? getDistricts(address) : null), [address])
  const divisionIds = districts.data?.divisions.map((d) => d.id) ?? []
  const officials = useAsync(() => (divisionIds.length ? getOfficials(divisionIds) : null), [divisionIds.join(",")])

  useElectionNotifications(voter.data?.election ?? elections.data?.elections?.[0])

  // Move focus to the new page's heading for screen-reader and keyboard users.
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    mainRef.current?.querySelector("h1")?.focus()
    document.querySelector('.tabs [aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" })
    document.title = `${ROUTES[path]} · Ballot Ready`
  }, [path])

  const submitAddress = (value, useDemo) => {
    save("address", value)
    save("demo", useDemo)
    setAddress(value)
    setDemo(useDemo)
    navigate("/")
  }

  const clearData = () => {
    if (!confirm("Remove your saved address, ballot picks and settings from this browser?")) return
    clearAll()
    setAddress(null)
    setDemo(false)
    navigate("/")
  }

  const ctx = { address, demo, elections, voter, districts, officials, setDemo: (v) => (save("demo", v), setDemo(v)) }
  const needsAddress = !address && path !== "/insights"

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="wrap header-row">
          <Link to="/" className="brand" aria-label="Ballot Ready home">
            <svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" /><path d="M8 17l5 5 11-12" /></svg>
            Ballot Ready
          </Link>
          {address && (
            <button
              className="link-button"
              onClick={() => {
                setAddress(null)
                navigate("/")
              }}
            >
              Change address
            </button>
          )}
        </div>
        {address && (
          <nav aria-label="Sections" className="wrap tabs">
            {Object.entries(ROUTES).map(([to, label]) => (
              <Link key={to} to={to} aria-current={path === to ? "page" : undefined}>
                {label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main id="main" ref={mainRef} className="wrap">
        {needsAddress ? (
          <AddressForm onSubmit={submitAddress} initialAddress={load("address", "")} initialDemo={demo} />
        ) : (
          <>
            {demo && path !== "/insights" && (
              <p className="banner" role="status">
                Showing Google's <strong>test election</strong> data, not a real ballot.{" "}
                <button className="link-button" onClick={() => ctx.setDemo(false)}>Switch to real elections</button>
              </p>
            )}
            {path === "/" && <Overview {...ctx} />}
            {path === "/vote" && <WhereToVote {...ctx} />}
            {path === "/ballot" && <SampleBallot {...ctx} />}
            {path === "/measures" && <Measures {...ctx} />}
            {path === "/reminders" && <Reminders {...ctx} />}
            {path === "/districts" && <Districts {...ctx} />}
            {path === "/insights" && <Insights />}
          </>
        )}
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <p>
            Ballot Ready helps you prepare to vote. It does not register you, cast a ballot, or recommend candidates or
            positions. Always confirm details with your official election office.
          </p>
          <p>
            Your address is kept only in this browser and sent to our server just to look up election data. It is never
            stored or logged.{" "}
            <button className="link-button" onClick={clearData}>Clear my data</button>
          </p>
          <p className="muted">
            Data: Google Civic Information API, Voting Information Project, unitedstates/congress-legislators, OpenStates,
            U.S. Census Bureau.
          </p>
        </div>
      </footer>
    </>
  )
}
