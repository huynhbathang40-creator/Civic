import { useState } from "react"
import { Link } from "../lib/router.jsx"

export default function AddressForm({ onSubmit, initialAddress = "", initialDemo = false }) {
  const [value, setValue] = useState(initialAddress)
  const [demo, setDemo] = useState(initialDemo)
  const [error, setError] = useState("")

  const submit = (e) => {
    e.preventDefault()
    const address = value.trim().replace(/\s+/g, " ")
    if (address.length < 5 || !/\d/.test(address)) {
      setError("Enter your full home address, including the street number, city and state.")
      return
    }
    onSubmit(address, demo)
  }

  return (
    <section className="landing">
      <h1 tabIndex={-1}>Everything you need to vote, from one address</h1>
      <p className="lede">
        Find where to vote, see your sample ballot, understand ballot measures in plain language, and get reminders.
      </p>
      <form onSubmit={submit} className="card address-form" noValidate>
        <label htmlFor="address">Your home address</label>
        <input
          id="address"
          name="street-address"
          autoComplete="street-address"
          inputMode="text"
          placeholder="123 Main St, Springfield, IL 62701"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError("")
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={`address-help${error ? " address-error" : ""}`}
          required
        />
        {error && (
          <p id="address-error" className="error" role="alert">
            {error}
          </p>
        )}
        <p id="address-help" className="help">
          🔒 Your address stays in this browser. It's sent to our server only to look up election data, and is never
          stored or logged.
        </p>
        <label className="check">
          <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
          Use Google's test election (demo data, any address)
        </label>
        <button type="submit" className="primary">Look up my election</button>
      </form>
      <p className="muted center">
        Just curious? See <Link to="/insights">polling access insights</Link> by county. No address needed.
      </p>
    </section>
  )
}
