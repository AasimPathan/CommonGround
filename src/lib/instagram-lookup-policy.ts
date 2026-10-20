export const LOOKUP_COOLDOWN_MS = 10_000;

export type LookupFailureCode = "quota" | "rate_limit" | "cooldown";
export class InstagramLookupError extends Error {
  constructor(message: string, public code: LookupFailureCode, public retryAt: number) { super(message); }
}

export function providerLimit(headers: Headers, now = Date.now(), provider = "GramScraper", creditsExhausted = false): InstagramLookupError {
  const retry = headers.get("retry-after");
  const seconds = retry == null ? NaN : Number(retry);
  const retryAt = Number.isFinite(seconds) && seconds >= 0
    ? now + seconds * 1000
    : retry && Number.isFinite(Date.parse(retry)) ? Math.max(now, Date.parse(retry)) : now + 60_000;
  const quota = creditsExhausted || headers.get("x-ratelimit-requests-remaining") === "0";
  const resetSeconds = Number(headers.get("x-ratelimit-requests-reset"));
  const quotaReset = quota && Number.isFinite(resetSeconds) && resetSeconds > 0 ? now + resetSeconds * 1000 : retryAt;
  return new InstagramLookupError(
    quota
      ? `${provider}'s Instagram lookup credits are exhausted. The service owner needs to configure available credits. Manual entry and screenshot evidence are still available.`
      : `${provider} is temporarily limiting Instagram lookups. Please wait before checking again, or use manual entry or screenshot evidence.`,
    quota ? "quota" : "rate_limit", Math.max(retryAt, quotaReset),
  );
}

/** Per-worker protection; the browser guard also survives component remounts. No automatic retries. */
export function createLookupGate<T>() {
  const pending = new Map<string, { username: string; promise: Promise<T> }>();
  const cooldowns = new Map<string, number>();
  let providerBlock: InstagramLookupError | null = null;
  return (userId: string, username: string, lookup: () => Promise<T>): Promise<T> => {
    const current = pending.get(userId);
    if (current?.username === username) return current.promise;
    const now = Date.now();
    if (current) return Promise.reject(new InstagramLookupError("An Instagram lookup is already in progress.", "cooldown", now + LOOKUP_COOLDOWN_MS));
    if (providerBlock && providerBlock.retryAt > now) return Promise.reject(providerBlock);
    for (const [id, until] of cooldowns) if (until <= now) cooldowns.delete(id);
    const until = cooldowns.get(userId) ?? 0;
    if (until > now) return Promise.reject(new InstagramLookupError("Please wait before checking another Instagram profile.", "cooldown", until));
    const promise = Promise.resolve().then(lookup).catch((error: unknown) => {
      if (error instanceof InstagramLookupError && error.code !== "cooldown") providerBlock = error;
      throw error;
    }).finally(() => {
      pending.delete(userId);
      cooldowns.set(userId, Date.now() + LOOKUP_COOLDOWN_MS);
    });
    pending.set(userId, { username, promise });
    return promise;
  };
}