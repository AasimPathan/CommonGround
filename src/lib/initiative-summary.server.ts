import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export type InitiativeSummary = {
  quick_summary: string;
  what_is_this_about: string;
  why_it_matters: string;
  key_points: string[];
  who_is_affected: string;
  what_creators_are_asked: string;
};

const MISSING = "Not specified in this initiative.";

const INSTRUCTIONS = `You summarize a single community initiative for a business reader.
STRICT RULES:
- Use ONLY the initiative data provided by the user message. No outside knowledge, no web search.
- Never invent facts, statistics, names, causes, affected groups, claims, sources, or context. Do not infer unsupported facts.
- Preserve the initiative's meaning and wording where possible.
- Items under "Claims" are attributed claims, not established facts; if you mention them, say who claims them.
- If a section's information is not present in the data, write exactly: "${MISSING}"
- This is summarization only: no fact-checking, opinions, or recommendations.
Return JSON only, in this exact shape:
{"quick_summary": string (one line), "what_is_this_about": string, "why_it_matters": string, "key_points": string[] (2-5 short items, or [] if none), "who_is_affected": string, "what_creators_are_asked": string}`;

export async function summarizeInitiativeData(data: Record<string, unknown>): Promise<InitiativeSummary> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured.");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system: INSTRUCTIONS,
    messages: [{ role: "user", content: `Initiative data (JSON):\n${JSON.stringify(data, null, 2)}` }],
    providerOptions: {
      openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
    },
  });
  let text = "";
  try {
    text = await result.text;
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 429) throw new Error("Too many requests right now. Please try again in a moment.");
    if (status === 402) throw new Error("AI credits are used up. Add credits in Settings → Plans & credits.");
    throw new Error("We couldn't generate a summary. Please try again.");
  }
  const match = text.match(/\{[\s\S]*\}/);
  let parsed: Partial<InitiativeSummary> = {};
  try { parsed = match ? JSON.parse(match[0]) : {}; } catch { throw new Error("The summary came back in an unexpected format. Please try again."); }
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : MISSING);
  return {
    quick_summary: str(parsed.quick_summary),
    what_is_this_about: str(parsed.what_is_this_about),
    why_it_matters: str(parsed.why_it_matters),
    key_points: Array.isArray(parsed.key_points) ? parsed.key_points.filter((p): p is string => typeof p === "string" && !!p.trim()).slice(0, 5) : [],
    who_is_affected: str(parsed.who_is_affected),
    what_creators_are_asked: str(parsed.what_creators_are_asked),
  };
}
