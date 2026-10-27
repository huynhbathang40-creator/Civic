import { useEffect, useState } from "react"

// Runs `fn` whenever `deps` change; ignores results from stale runs.
export function useAsync(fn, deps) {
  const [state, setState] = useState({ status: "idle", data: null, error: null })
  useEffect(() => {
    let live = true
    const p = fn()
    if (!p) {
      setState({ status: "idle", data: null, error: null })
      return
    }
    setState((s) => ({ status: "loading", data: s.data, error: null }))
    p.then(
      (data) => live && setState({ status: "ready", data, error: null }),
      (error) => live && setState({ status: "error", data: null, error }),
    )
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}
