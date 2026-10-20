import { afterEach, describe, expect, test } from "bun:test";
import { createLookupGate, InstagramLookupError, providerLimit } from "../src/lib/instagram-lookup-policy";
import { fetchInstagramProfile, signCheck, verifyCheck } from "../src/lib/instagram-profile.server";

const originalFetch = globalThis.fetch;
const TEST_KEY = "local-test-only-not-a-provider-key";
const SIGNING_KEY = "local-test-only-signing-fixture";

afterEach(() => {
  globalThis.fetch = originalFetch;

});

describe("Instagram lookup safeguards", () => {
  test("same pending username performs exactly one provider lookup", async () => {
    const gate = createLookupGate<string>(); let calls = 0; let finish: ((value: string) => void) | undefined;
    const lookup = () => { calls++; return new Promise<string>((resolve) => { finish = resolve; }); };
    const first = gate("creator", "natgeo", lookup); const second = gate("creator", "natgeo", lookup);
    await Promise.resolve(); expect(calls).toBe(1); expect(first).toBe(second);
    finish?.("natgeo"); expect(await first).toBe("natgeo");
  });
  test("pending different username and immediate repeat cannot start another lookup", async () => {
    const gate = createLookupGate<string>(); let calls = 0;
    const first = gate("creator", "a", async () => { calls++; return "a"; });
    await expect(gate("creator", "b", async () => "b")).rejects.toThrow("already in progress");
    await first;
    await expect(gate("creator", "a", async () => { calls++; return "a"; })).rejects.toThrow("wait");
    expect(calls).toBe(1);
  });
  test("Retry-After seconds and HTTP date are respected", () => {
    const now = 1_800_000_000_000;
    expect(providerLimit(new Headers({ "Retry-After": "120" }), now).retryAt).toBe(now + 120_000);
    expect(providerLimit(new Headers({ "Retry-After": new Date(now + 180_000).toUTCString() }), now).retryAt).toBe(now + 180_000);
  });
  test("exhausted request quota uses provider reset rather than fake 60-second recovery", () => {
    const limit = providerLimit(new Headers({ "x-ratelimit-requests-remaining": "0", "x-ratelimit-requests-reset": "2672285" }), 1000);
    expect(limit.code).toBe("quota"); expect(limit.retryAt).toBe(2672286000);
  });
  test("provider limit blocks follow-up attempts without retrying", async () => {
    const gate = createLookupGate<string>(); let calls = 0;
    await expect(gate("a", "a", async () => { calls++; throw new InstagramLookupError("limited", "rate_limit", Date.now() + 120_000); })).rejects.toThrow("limited");
    await expect(gate("b", "b", async () => { calls++; return "b"; })).rejects.toThrow("limited");
    expect(calls).toBe(1);
  });
  test("HTTP 429 makes one fetch, returns a real error and never fabricates success", async () => {
    let calls = 0;
    globalThis.fetch = (async () => { calls++; return new Response("{}", { status: 429, headers: { "Retry-After": "120" } }); }) as typeof fetch;
    await expect(fetchInstagramProfile("natgeo", TEST_KEY)).rejects.toThrow("temporarily limiting");
    expect(calls).toBe(1);
  });
  test("successful fetch preserves null metrics and signed confirmation makes no second lookup", async () => {
    let calls = 0;
    globalThis.fetch = (async () => { calls++; return Response.json({ username: "natgeo", full_name: "National Geographic", follower_count: 123, following_count: 4, media_count: 5 }); }) as typeof fetch;
    const profile = await fetchInstagramProfile("natgeo", TEST_KEY);
    expect(profile.follower_count).toBe(123); expect(profile.category).toBeNull();
    const signed = await signCheck("creator", profile, SIGNING_KEY);
    expect(await verifyCheck("creator", signed, SIGNING_KEY)).toEqual(profile); expect(calls).toBe(1);
    await expect(verifyCheck("other", signed, SIGNING_KEY)).rejects.toThrow("verified");
  });
});