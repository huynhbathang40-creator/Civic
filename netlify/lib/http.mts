// Shared helpers for the API proxy functions. Addresses are personal data:
// never log them and never put them in URLs we control.
import { createHash } from "node:crypto"

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } })

export const fail = (status: number, code: string, message: string) => json({ error: { code, message } }, status)

export async function readBody<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T
  } catch {
    return null
  }
}

export function cleanAddress(value: unknown): string | null {
  if (typeof value !== "string") return null
  const address = value.trim().replace(/\s+/g, " ")
  return address.length >= 5 && address.length <= 200 ? address : null
}

export const hash = (...parts: string[]) => createHash("sha256").update(parts.join("|")).digest("hex")

// Small in-memory TTL cache. Lives only as long as a warm function instance,
// which is enough to absorb repeat lookups without a database.
export function ttlCache<T>(ttlMs: number, max = 500) {
  const store = new Map<string, { at: number; value: T }>()
  return {
    get(key: string): T | undefined {
      const hit = store.get(key)
      if (!hit) return undefined
      if (Date.now() - hit.at > ttlMs) {
        store.delete(key)
        return undefined
      }
      return hit.value
    },
    set(key: string, value: T) {
      if (store.size >= max) store.delete(store.keys().next().value as string)
      store.set(key, { at: Date.now(), value })
    },
  }
}
