import { useEffect, useState } from "react"

export const ROUTES = {
  "/": "Overview",
  "/vote": "Where do I vote",
  "/ballot": "Sample ballot",
  "/measures": "Ballot measures",
  "/reminders": "Reminders",
  "/districts": "Districts & officials",
  "/insights": "Polling access insights",
}

export function usePath() {
  const [path, setPath] = useState(() => (ROUTES[location.pathname] ? location.pathname : "/"))
  useEffect(() => {
    const onPop = () => setPath(ROUTES[location.pathname] ? location.pathname : "/")
    addEventListener("popstate", onPop)
    return () => removeEventListener("popstate", onPop)
  }, [])
  return path
}

export function navigate(path) {
  if (path === location.pathname) return
  history.pushState(null, "", path)
  dispatchEvent(new PopStateEvent("popstate"))
  scrollTo(0, 0)
}

// Plain anchors that route in-app but still work as real links.
export function Link({ to, children, ...rest }) {
  return (
    <a
      href={to}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        navigate(to)
      }}
      {...rest}
    >
      {children}
    </a>
  )
}
