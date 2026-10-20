import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

export type SocialSummary = {
  account_overview: string; audience_size: string; visible_engagement: string;
  content_activity: string; content_niche: string; platform_presence: string; quick_summary: string;
};
const KEYS: (keyof SocialSummary)[] = ["account_overview", "audience_size", "visible_engagement", "content_activity", "content_niche", "platform_presence", "quick_summary"];
const MISSING = "Not available.";

const SUMMARY_RULES = `You summarize one creator's social account for a business reader.
STRICT RULES:
- Use ONLY the account data in the user message. No outside knowledge, no guessing, no browsing.
- Values of "Not available" are unknown: write "${MISSING}" for a section with no supporting data. Never estimate.
- Audience Size = followers/subscribers only. Visible Engagement = visible views, likes and comments only.
- NEVER call followers "reach". Mention reach or impressions only if a "Reach" or "Impressions" field is present.
- Never claim the account is verified, official or authenticated by the platform.
- No scores, ratings, rankings or quality judgements. Describe, don't rate.
Return JSON only: {"account_overview":string,"audience_size":string,"visible_engagement":string,"content_activity":string,"content_niche":string,"platform_presence":string,"quick_summary":string (one line)}`;

const EXTRACT_RULES = `You read a screenshot of a social media profile. Extract ONLY values that are clearly and visibly displayed.
- Do not guess, estimate, or infer. If a value is not visible, return null.
- Convert shorthand like "12.5K" to 12500 and "1.2M" to 1200000.
- reach and impressions only if those exact labels are visible (e.g. in an insights screenshot).
Return JSON only: {"username":string|null,"display_name":string|null,"followers":number|null,"posts":number|null,"likes":number|null,"comments":number|null,"views":number|null,"reach":number|null,"impressions":number|null,"bio_niche":string|null}`;

async function run(system: string, messages: ModelMessage[]) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured.");
  const provider = createOpenAI({ baseURL: "https://ai.gateway.lovable.dev/v1", apiKey, headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" } });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"), system, messages,
    providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
  });
  let text = "";
  try { text = await result.text; } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 429) throw new Error("Too many requests right now. Please try again in a moment.");
    if (status === 402) throw new Error("AI credits are used up. Add credits in Settings → Plans & credits.");
    throw new Error("The AI couldn't process this. Please try again.");
  }
  const match = text.match(/\{[\s\S]*\}/);
  try { return (match ? JSON.parse(match[0]) : {}) as Record<string, unknown>; } catch { throw new Error("The AI reply came back in an unexpected format. Please try again."); }
}

export async function summarizeSocialData(account: Record<string, string>, source: string): Promise<SocialSummary> {
  const label = source === "uploaded_evidence" ? "Source: extracted from an uploaded screenshot." : "Source: profile information provided in the app.";
  const parsed = await run(SUMMARY_RULES, [{ role: "user", content: `${label}\nAccount data (JSON):\n${JSON.stringify(account, null, 2)}` }]);
  return Object.fromEntries(KEYS.map((k) => [k, typeof parsed[k] === "string" && (parsed[k] as string).trim() ? (parsed[k] as string).trim() : MISSING])) as SocialSummary;
}

export async function extractFromScreenshot(bytes: Uint8Array, mediaType: string, platform: string) {
  const parsed = await run(EXTRACT_RULES, [{ role: "user", content: [{ type: "text", text: `Platform: ${platform}. Extract the visible profile values.` }, { type: "image", image: bytes, mediaType }] }]);
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
  const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return {
    username: s(parsed["username"]), display_name: s(parsed["display_name"]), bio_niche: s(parsed["bio_niche"]),
    followers: n(parsed["followers"]), posts: n(parsed["posts"]), likes: n(parsed["likes"]), comments: n(parsed["comments"]),
    views: n(parsed["views"]), reach: n(parsed["reach"]), impressions: n(parsed["impressions"]),
  };
}
