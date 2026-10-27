import type { Config } from "@netlify/functions"
import Anthropic from "@anthropic-ai/sdk"
import { fail, hash, json, readBody, ttlCache } from "../lib/http.mts"

// Plain-language ballot measure explainer. Runs through Netlify AI Gateway,
// which injects ANTHROPIC_API_KEY / ANTHROPIC_BASE_URL; setting your own key
// in the project's env vars also works. Set EXPLAIN_MODEL to pin a model.
const MODELS = [Netlify.env.get("EXPLAIN_MODEL"), "claude-sonnet-5-5", "claude-sonnet-4-5"].filter(Boolean) as string[]
const LANGUAGES: Record<string, string> = { en: "English", es: "Spanish", vi: "Vietnamese" }
const cache = ttlCache<unknown>(24 * 60 * 60 * 1000, 300)

const SYSTEM = `You explain US ballot measures to voters in plain language.
Rules:
- Be strictly neutral. Never recommend a vote, never call the measure good or bad, never guess at motives.
- Use only the official text you are given. If something is unclear or missing from the text, say so instead of guessing.
- Write at about an 8th-grade reading level with short sentences.
- Do not mention supporters or opponents by name unless the official text names them, and then give both sides equally.
- Respond with JSON only, no prose before or after, matching:
{"summary": string (2-4 sentences), "yesMeans": string (1-2 sentences), "noMeans": string (1-2 sentences), "keyPoints": string[] (2-4 short items)}`

export default async (req: Request) => {
  const body = await readBody<{ title?: string; text?: string; language?: string; responses?: string[] }>(req)
  const title = typeof body?.title === "string" ? body.title.slice(0, 300) : ""
  const text = typeof body?.text === "string" ? body.text.slice(0, 20000) : ""
  const language = LANGUAGES[body?.language ?? "en"] ? body!.language! : "en"
  if (!title || text.length < 20) return fail(400, "bad_request", "This measure has no official text to explain.")

  const key = hash(title, text, language)
  const cached = cache.get(key)
  if (cached) return json(cached)

  if (!Netlify.env.get("ANTHROPIC_API_KEY"))
    return fail(503, "ai_unavailable", "Plain-language summaries are not available right now. The official text is shown below.")

  const anthropic = new Anthropic()
  const prompt = `Write the explanation in ${LANGUAGES[language]}. Keep JSON keys in English.

Measure title: ${title}

Official text:
"""
${text}
"""`

  for (const model of MODELS) {
    try {
      const message = await anthropic.messages.create({
        model,
        max_tokens: 1200,
        system: SYSTEM,
        messages: [{ role: "user", content: prompt }],
      })
      const out = message.content.map((b) => (b.type === "text" ? b.text : "")).join("")
      const parsed = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1))
      const result = {
        language,
        summary: String(parsed.summary ?? ""),
        yesMeans: String(parsed.yesMeans ?? ""),
        noMeans: String(parsed.noMeans ?? ""),
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.map(String).slice(0, 4) : [],
        generatedBy: "AI",
      }
      cache.set(key, result)
      return json(result)
    } catch (err: any) {
      // Model not offered by the gateway or account: try the next one.
      if (err?.status === 404 || (err?.status === 400 && /model/i.test(String(err?.message)))) continue
      if (err?.status === 429) return fail(429, "rate_limited", "Too many requests right now. Please try again in a minute.")
      return fail(502, "ai_error", "We couldn't generate a summary right now. The official text is shown below.")
    }
  }
  return fail(502, "ai_error", "No summary model is available right now. The official text is shown below.")
}

export const config: Config = {
  path: "/api/explain",
  method: "POST",
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ["ip", "domain"] },
}
