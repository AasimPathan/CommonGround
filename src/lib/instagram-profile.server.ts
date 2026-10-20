// Server-only: credentials are supplied by authenticated server handlers.
import { createLookupGate, providerLimit } from "./instagram-lookup-policy";
import { normalizeHandle, parseInstagramProfile, type InstagramProfile } from "./instagram-profile-data";
export { normalizeHandle } from "./instagram-profile-data";
export type { InstagramProfile } from "./instagram-profile-data";

type FailureCode = "configuration" | "unauthorized" | "forbidden" | "not_found" | "provider_error" | "invalid_response" | "timeout" | "network";
export type LookupEnvironment = "local" | "preview" | "published" | "unknown";
const DIAGNOSTIC_VERSION = "gramscraper-transport-v2";
export function lookupEnvironment(requestUrl: string): LookupEnvironment {
  try {
    const host = new URL(requestUrl).hostname;
    if (host === "localhost" || host === "127.0.0.1") return "local";
    if (host === "gentle-design-principles.lovable.app" || host === "project--92c1c6c4-74fc-45f6-8071-dd3a8c15a33e.lovable.app") return "published";
    if (host === "id-preview--92c1c6c4-74fc-45f6-8071-dd3a8c15a33e.lovable.app" || host === "project--92c1c6c4-74fc-45f6-8071-dd3a8c15a33e-dev.lovable.app") return "preview";
  } catch { /* No trusted request context. */ }
  return "unknown";
}
type DiagnosticContext = { environment: LookupEnvironment; started: number; stage: "configuration" | "connect" | "response_body" | "profile_parse" };
export class InstagramProviderError extends Error {
  constructor(message: string, public code: FailureCode, public status: number | null = null) { super(message); }
}

// Only fixed categories/codes are logged: never request headers, URLs, bodies or exception text.
function reportFailure(code: FailureCode | "quota" | "rate_limit", status: number | null, transportCode?: string, diagnostic?: DiagnosticContext, errorType?: string, transportCategory?: string) {
  console.warn("[instagram lookup]", { provider: "GramScraper", diagnosticVersion: DIAGNOSTIC_VERSION, code, status,
    environment: diagnostic?.environment ?? "unknown", stage: diagnostic?.stage ?? "unknown",
    elapsedMs: diagnostic ? Math.max(0, Math.round(performance.now() - diagnostic.started)) : 0,
    ...(errorType ? { errorType } : {}), ...(transportCategory ? { transportCategory } : {}), ...(transportCode ? { transportCode } : {}) });
}
function transportFailure(error: unknown, status: number | null = null, diagnostic?: DiagnosticContext): InstagramProviderError {
  const e = error && typeof error === "object" ? error as { name?: unknown; message?: unknown; cause?: { code?: unknown; message?: unknown } } : {};
  const allowed = ["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "CERT_HAS_EXPIRED", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "ERR_TLS_CERT_ALTNAME_INVALID"];
  const transportCode = typeof e.cause?.code === "string" && allowed.includes(e.cause.code) ? e.cause.code : undefined;
  const timeout = e.name === "TimeoutError" || e.name === "AbortError" || transportCode === "ETIMEDOUT" || transportCode?.endsWith("_TIMEOUT");
  const code = timeout ? "timeout" : "network";
  const errorType = typeof e.name === "string" && ["TypeError", "Error", "TimeoutError", "AbortError", "NetworkError"].includes(e.name) ? e.name : "OtherError";
  // Inspect transiently for fixed categories, never log the text itself.
  const text = [e.message, e.cause?.message].filter(v => typeof v === "string").join(" ");
  const transportCategory = timeout ? "timeout" : /dns|resolve|ENOTFOUND|EAI_AGAIN/i.test(text + transportCode) ? "dns"
    : /tls|ssl|certificate|CERT_|LEAF_SIGNATURE/i.test(text + transportCode) ? "tls"
    : /redirect/i.test(text) ? "redirect" : /refused|reset|disconnect/i.test(text + transportCode) ? "connection" : "unclassified";
  reportFailure(code, status, transportCode, diagnostic, errorType, transportCategory);
  return new InstagramProviderError(timeout
    ? "GramScraper did not respond within 30 seconds. No automatic retry was made. Please try later or use screenshot evidence."
    : "The backend could not connect to GramScraper. No HTTP response was received. Please try later or use screenshot evidence.", code, status);
}

export async function fetchInstagramProfile(usernameOrUrl: string, key: string, environment: LookupEnvironment = "unknown"): Promise<InstagramProfile> {
  const diagnostic: DiagnosticContext = { environment, started: performance.now(), stage: "configuration" };
  const wanted = normalizeHandle(usernameOrUrl);
  if (!wanted) throw new Error("That doesn't look like a valid Instagram username or profile link.");
  if (!key.trim()) {
    reportFailure("configuration", null, undefined, diagnostic);
    throw new InstagramProviderError("Instagram lookup is not configured. The service owner needs to set GRAMSCRAPER_API_KEY in secure backend secrets.", "configuration");
  }

  let res: Response;
  diagnostic.stage = "connect";
  try {
    // The hosted Worker runtime rejects redirect:"error"; use "manual" and refuse redirects below.
    res = await fetch(`https://gramscraper.com/api/instagram/v1/user/by/username?username=${encodeURIComponent(wanted)}`, {
      method: "GET", headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      redirect: "manual", signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    throw transportFailure(error, null, diagnostic);
  }
  if ((res.status >= 300 && res.status < 400) || res.type === "opaqueredirect") {
    reportFailure("provider_error", res.status || null, undefined, diagnostic);
    throw new InstagramProviderError("GramScraper redirected the lookup instead of answering. No profile data was saved; please try later or use screenshot evidence.", "provider_error", res.status || null);
  }
  diagnostic.stage = "response_body";
  let body: unknown;
  try { body = await res.json(); } catch (error) {
    if (res.ok) {
      if (error instanceof SyntaxError) {
        reportFailure("invalid_response", res.status, undefined, diagnostic);
        throw new InstagramProviderError("GramScraper returned an unreadable profile response. No profile data was saved.", "invalid_response", res.status);
      }
      throw transportFailure(error, res.status, diagnostic);
    }
    body = null;
  }
  const errorData = body && typeof body === "object" ? body as Record<string, unknown> : {};
  // Inspect only to classify failures; never return or log raw provider bodies.
  const errorText = [errorData["message"], errorData["error"], errorData["code"]].filter((v) => typeof v === "string").join(" ");
  const exhausted = res.status === 402 || /(?:insufficient|exhausted|no|not enough|out of)[ _-]*(?:credits|quota)|(?:credits|quota)[ _-]*(?:exhausted|depleted|exceeded)/i.test(errorText);
  const fail = (code: FailureCode, message: string): never => {
    reportFailure(code, res.status, undefined, diagnostic);
    throw new InstagramProviderError(message, code, res.status);
  };
  // HTTP status takes precedence over untrusted provider error text.
  if (res.status === 401) fail("unauthorized", "GramScraper rejected the API key (HTTP 401). The service owner needs to check GRAMSCRAPER_API_KEY in secure backend secrets.");
  if (res.status === 403) fail("forbidden", "GramScraper denied API access (HTTP 403). The service owner needs to check the account's API permissions.");
  if (res.status === 404) fail("not_found", "GramScraper could not find that Instagram username (HTTP 404). Check the username or use screenshot evidence.");
  if (res.status >= 500) fail("provider_error", `GramScraper has a server error (HTTP ${res.status}). Please try later; no automatic retry was made.`);
  if (res.status === 402 || res.status === 429 || exhausted) {
    const limit = providerLimit(res.headers, Date.now(), "GramScraper", res.status === 402 || (res.status !== 429 && exhausted));
    reportFailure(limit.code === "quota" ? "quota" : "rate_limit", res.status, undefined, diagnostic);
    throw limit;
  }
  if (!res.ok) fail("provider_error", `GramScraper rejected the lookup (HTTP ${res.status}). Please try later or use screenshot evidence.`);
  diagnostic.stage = "profile_parse";
  try { return parseInstagramProfile(body, wanted); } catch (error) {
    reportFailure("invalid_response", res.status, undefined, diagnostic);
    throw new InstagramProviderError(error instanceof Error ? error.message : "GramScraper did not return usable profile data.", "invalid_response", res.status);
  }
}

const lookupOnce = createLookupGate<InstagramProfile>();
export function lookupInstagramProfile(userId: string, input: string, key: string, environment: LookupEnvironment = "unknown"): Promise<InstagramProfile> {
  const username = normalizeHandle(input);
  if (!username) throw new Error("That doesn't look like a valid Instagram username or profile link.");
  return lookupOnce(userId, username, () => fetchInstagramProfile(username, key, environment));
}

// Signs a checked result so Confirm can trust it without a second paid lookup.
async function hmac(text: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("ig-check:" + secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}
export async function signCheck(userId: string, p: InstagramProfile, secret: string) {
  const issuedAt = Date.now();
  return { profile: p, issuedAt, token: await hmac(`${userId}|${issuedAt}|${JSON.stringify(p)}`, secret) };
}
export async function verifyCheck(userId: string, c: { profile: InstagramProfile; issuedAt: number; token: string }, secret: string): Promise<InstagramProfile> {
  if (Date.now() - c.issuedAt > 30 * 60 * 1000 || c.issuedAt > Date.now()) throw new Error("This check has expired. Please press Check Profile again.");
  const expected = await hmac(`${userId}|${c.issuedAt}|${JSON.stringify(c.profile)}`, secret);
  let difference = expected.length ^ c.token.length;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ (c.token.charCodeAt(i) || 0);
  if (difference !== 0) throw new Error("This result couldn't be verified. Please press Check Profile again.");
  return c.profile;
}
