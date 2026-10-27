import { useState } from "react"
import { downloadIcs } from "../lib/ics.js"
import { formatDate, relativeDays } from "../lib/format.js"
import { load, save } from "../lib/storage.js"
import { Loading, ErrorNote, PageHeader } from "./common.jsx"

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

function eventsFor(election, voterData) {
  const info = voterData?.electionOffices?.[0]?.infoUrl
  const events = [
    {
      uid: `election-${election.id}`,
      date: election.electionDay,
      title: `Election Day: ${election.name}`,
      description: "Polls are open today. Bring anything your state requires and check your polling place before you go.",
      url: info,
    },
  ]
  const early = voterData?.election?.id === election.id ? voterData.earlyVoting : null
  if (early?.start && early.start < election.electionDay) {
    events.unshift({
      uid: `early-${election.id}`,
      date: early.start,
      title: `Early voting starts: ${election.name}`,
      description: `Early voting runs ${formatDate(early.start)}${early.end ? ` to ${formatDate(early.end)}` : ""}. Hours vary by site.`,
      url: info,
    })
  }
  return events
}

export default function Reminders({ elections, voter }) {
  const [notify, setNotify] = useState(() => load("notify", false))
  const [permission, setPermission] = useState(() => (typeof Notification === "undefined" ? "unsupported" : Notification.permission))

  // Prefer the election tied to this address, then everything else upcoming.
  const list = [...(elections.data?.elections ?? [])]
  const current = voter.data?.election
  if (current && !list.some((e) => e.id === current.id)) list.unshift(current)
  list.sort((a, b) => (a.id === current?.id ? -1 : b.id === current?.id ? 1 : a.electionDay.localeCompare(b.electionDay)))

  const toggleNotify = async () => {
    if (notify) {
      setNotify(false)
      save("notify", false)
      return
    }
    let p = permission
    if (p === "default") p = await Notification.requestPermission()
    setPermission(p)
    if (p === "granted") {
      setNotify(true)
      save("notify", true)
    }
  }

  return (
    <>
      <PageHeader title="Election reminders">
        <p>Add key dates to your own calendar. Nothing is stored on our servers and we never email or text you.</p>
      </PageHeader>

      {elections.status === "loading" && !list.length && <Loading label="Loading upcoming elections…" />}
      {elections.status === "error" && <ErrorNote error={elections.error} />}
      {elections.status === "ready" && !list.length && <p className="note">No upcoming elections are listed yet. Check back closer to election season.</p>}

      <ul className="elections">
        {list.map((e) => {
          const events = eventsFor(e, voter.data)
          return (
            <li key={e.id} className="card election">
              <div>
                <h2>{e.name}</h2>
                <p>{formatDate(e.electionDay)} <span className="pill">{relativeDays(e.electionDay)}</span></p>
                {events.length > 1 && <p className="muted">Early voting starts {formatDate(events[0].date)}</p>}
                {e.id === current?.id && <p className="muted">On your ballot</p>}
              </div>
              <button className="primary" onClick={() => downloadIcs(`${slug(e.name)}.ics`, events)}>
                Add to calendar<span className="sr-only"> for {e.name}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="muted">The .ics file works with Google Calendar, Apple Calendar and Outlook, and includes an alert the day before.</p>

      <section className="card" aria-labelledby="h-notify">
        <h2 id="h-notify">Browser reminders</h2>
        <p>
          When this is on, opening Ballot Ready in the week before an election shows a reminder notification (once a
          day). For reminders when the app is closed, use the calendar file above.
        </p>
        {permission === "unsupported" ? (
          <p className="muted">This browser doesn't support notifications.</p>
        ) : permission === "denied" ? (
          <p className="muted">Notifications are blocked for this site. You can allow them in your browser settings.</p>
        ) : (
          <label className="switch">
            <input type="checkbox" role="switch" checked={notify} onChange={toggleNotify} />
            <span>Remind me in this browser</span>
          </label>
        )}
      </section>
    </>
  )
}
