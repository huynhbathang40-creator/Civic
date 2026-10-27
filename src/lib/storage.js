// Everything personal lives only in this browser. Storage can be blocked
// (private mode, disabled site data), so every access is guarded.
// The prefix predates the app's rename; keeping it preserves saved data.
const PREFIX = "ballotready:"

export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* storage unavailable: the app still works for this visit */
  }
}

export function clearAll() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    /* nothing to clear */
  }
}
