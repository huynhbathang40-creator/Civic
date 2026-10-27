import { useEffect } from "react"
import { daysUntil, formatDate } from "./format.js"
import { load, save } from "./storage.js"

// Without a server we can't push, so reminders fire when the app is opened in
// the week before an election, at most once a day.
export function useElectionNotifications(election) {
  useEffect(() => {
    if (!election || !load("notify", false)) return
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return
    const days = daysUntil(election.electionDay)
    if (days == null || days < 0 || days > 7) return
    const today = new Date().toISOString().slice(0, 10)
    if (load("lastNotified") === today) return
    save("lastNotified", today)
    const when = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`
    new Notification(`${election.name} is ${when}`, {
      body: `Election Day: ${formatDate(election.electionDay)}. Check where you vote in Civic Compass.`,
      icon: "/favicon.svg",
      tag: `election-${election.id}`,
    })
  }, [election?.id])
}
