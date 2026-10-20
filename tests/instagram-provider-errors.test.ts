import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { fetchInstagramProfile, InstagramProviderError, lookupEnvironment } from "../src/lib/instagram-profile.server";
import { InstagramLookupError } from "../src/lib/instagram-lookup-policy";

const originalFetch = globalThis.fetch;
const warn = spyOn(console, "warn").mockImplementation(() => {});
afterEach(() => { globalThis.fetch = originalFetch; warn.mockClear(); });

describe("GramScraper request and safe errors (offline)", () => {
  test("diagnostics distinguish known deployment request hosts without guessing unknown hosts", () => {
    expect(lookupEnvironment("http://localhost:8080/profile")).toBe("local");
    expect(lookupEnvironment("https://id-preview--92c1c6c4-74fc-45f6-8071-dd3a8c15a33e.lovable.app/profile")).toBe("preview");
    expect(lookupEnvironment("https://gentle-design-principles.lovable.app/profile")).toBe("published");
    expect(lookupEnvironment("https://untrusted.example/profile")).toBe("unknown");
  });
  test("transport diagnostics capture stage, environment, elapsed time and safe DNS category", async () => {
    globalThis.fetch = (async () => { throw new TypeError("private-text-fixture", { cause: { code: "ENOTFOUND" } }); }) as typeof fetch;
    await expect(fetchInstagramProfile("nasa", "offline-fixture", "preview")).rejects.toMatchObject({ code: "network" });
    const details = warn.mock.calls[0]?.[1];
    expect(details).toMatchObject({ environment: "preview", stage: "connect", status: null, errorType: "TypeError", transportCategory: "dns", transportCode: "ENOTFOUND", diagnosticVersion: "gramscraper-transport-v2" });
    expect((details as { elapsedMs: number }).elapsedMs).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(warn.mock.calls)).not.toContain("private-text-fixture");
  });
  test("documented GET endpoint, normalized username parameter and backend Bearer header", async () => {
    let calls = 0;
    globalThis.fetch = (async (input, init) => {
      calls++;
      expect(String(input)).toBe("https://gramscraper.com/api/instagram/v1/user/by/username?username=nasa");
      expect(init?.method).toBe("GET");
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer offline-fixture");
      expect(init?.redirect).toBe("manual");
      return Response.json({ username: "nasa" });
    }) as typeof fetch;
    expect((await fetchInstagramProfile("https://www.instagram.com/NASA/", "offline-fixture")).username).toBe("nasa");
    expect(calls).toBe(1);
  });
  test("provider redirect is refused once without following it", async () => {
    let calls = 0;
    globalThis.fetch = (async () => { calls++; return new Response(null, { status: 302, headers: { Location: "https://elsewhere.example/" } }); }) as typeof fetch;
    await expect(fetchInstagramProfile("nasa", "offline-fixture")).rejects.toMatchObject({ code: "provider_error", status: 302 });
    expect(calls).toBe(1);
  });
  test("missing key does not send a lookup", async () => {
    let calls = 0;
    globalThis.fetch = (async () => { calls++; return Response.json({}); }) as typeof fetch;
    await expect(fetchInstagramProfile("nasa", "")).rejects.toMatchObject({ code: "configuration", status: null });
    expect(calls).toBe(0);
  });
  for (const [status, code] of [[401, "unauthorized"], [403, "forbidden"], [404, "not_found"], [500, "provider_error"], [503, "provider_error"]] as const) {
    test(`HTTP ${status} returns ${code} once and never leaks the body`, async () => {
      let calls = 0;
      globalThis.fetch = (async () => { calls++; return Response.json({ error: "untrusted-body-fixture" }, { status }); }) as typeof fetch;
      try { await fetchInstagramProfile("nasa", "offline-fixture"); throw new Error("Expected failure"); }
      catch (error) {
        expect(error).toBeInstanceOf(InstagramProviderError);
        expect(error).toMatchObject({ code, status });
        expect(String(error)).not.toContain("untrusted-body-fixture");
        expect(JSON.stringify(warn.mock.calls)).not.toContain("untrusted-body-fixture");
        expect(JSON.stringify(warn.mock.calls)).not.toContain("offline-fixture");
      }
      expect(calls).toBe(1);
    });
  }
  test("402 reports insufficient credits without retry", async () => {
    let calls = 0;
    globalThis.fetch = (async () => { calls++; return new Response("{}", { status: 402 }); }) as typeof fetch;
    await expect(fetchInstagramProfile("nasa", "offline-fixture")).rejects.toMatchObject({ code: "quota" });
    expect(calls).toBe(1);
  });
  test("429 respects Retry-After without retry", async () => {
    let calls = 0;
    const before = Date.now();
    globalThis.fetch = (async () => { calls++; return new Response("{}", { status: 429, headers: { "Retry-After": "120" } }); }) as typeof fetch;
    try { await fetchInstagramProfile("nasa", "offline-fixture"); throw new Error("Expected failure"); }
    catch (error) { expect(error).toBeInstanceOf(InstagramLookupError); if (error instanceof InstagramLookupError) { expect(error.code).toBe("rate_limit"); expect(error.retryAt).toBeGreaterThanOrEqual(before + 120_000); } }
    expect(calls).toBe(1);
  });
  for (const [name, code] of [["TimeoutError", "timeout"], ["TypeError", "network"]] as const) {
    test(`${name} is classified separately and raw exception text stays private`, async () => {
      let calls = 0;
      globalThis.fetch = (async () => { calls++; throw new DOMException("untrusted-transport-fixture", name); }) as typeof fetch;
      await expect(fetchInstagramProfile("nasa", "offline-fixture")).rejects.toMatchObject({ code, status: null });
      expect(JSON.stringify(warn.mock.calls)).not.toContain("untrusted-transport-fixture");
      expect(calls).toBe(1);
    });
  }
  test("unreadable HTTP 200 never returns fake data", async () => {
    globalThis.fetch = (async () => new Response("not-json", { status: 200 })) as typeof fetch;
    await expect(fetchInstagramProfile("nasa", "offline-fixture")).rejects.toMatchObject({ code: "invalid_response", status: 200 });
  });
});