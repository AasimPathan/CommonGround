import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { InstagramLookupError } from "./instagram-lookup-policy";
import { instagramMetrics, instagramProfilePatch } from "./instagram-profile-data";

async function requireCreator(supabase: { from: (t: "user_roles") => any }, userId: string) {
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (!((roles ?? []) as { role: string }[]).some((r) => r.role === "creator")) throw new Error("Available to creator accounts only.");
}

export const summarizeSocialAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { account: Record<string, string>; source: "profile_check" | "uploaded_evidence" }) =>
    z.object({ account: z.record(z.string(), z.string().max(2000)), source: z.enum(["profile_check", "uploaded_evidence"]) }).parse(input))
  .handler(async ({ data, context }) => {
    await requireCreator(context.supabase, context.userId);
    const { summarizeSocialData } = await import("./social-summary.server");
    return summarizeSocialData(data.account, data.source);
  });

/** Verifies the signed preview and saves it without another paid lookup. */
export const confirmInstagramAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { check: { profile: Record<string, unknown>; issuedAt: number; token: string } }) => z.object({ check: z.object({ profile: z.record(z.string(), z.unknown()), issuedAt: z.number(), token: z.string().length(64) }) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireCreator(supabase, userId);
    const { verifyCheck } = await import("./instagram-profile.server");
    const secret = process.env["INSTAGRAM_CHECK_SIGNING_SECRET"];
    if (!secret) throw new Error("Instagram confirmation is not configured. Please contact support.");
    const ig = await verifyCheck(userId, data.check as never, secret);
    const profileUrl = `https://www.instagram.com/${ig.username}/`;

    // Copy the picture into our own storage (Instagram picture links expire).
    let avatarPath: string | null = null;
    if (ig.profile_pic_url) {
      try {
        const picture = new URL(ig.profile_pic_url);
        if (picture.protocol !== "https:" || !(picture.hostname.endsWith(".cdninstagram.com") || picture.hostname.endsWith(".fbcdn.net"))) throw new Error("Unsupported picture host");
        // Worker runtime rejects redirect:"error"; "manual" leaves redirects non-OK, so they are skipped.
        const r = await fetch(picture, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
        if (r.ok) {
          const type = r.headers.get("content-type") || "image/jpeg";
          if (!type.startsWith("image/")) throw new Error("Invalid picture type");
          const bytes = new Uint8Array(await r.arrayBuffer());
          if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("Picture too large");
          const path = `${userId}/instagram-${Date.now()}.jpg`;
          const { error } = await supabase.storage.from("creator-avatars").upload(path, bytes, { upsert: true, contentType: type });
          if (!error) avatarPath = path;
        }
      } catch { /* picture stays unavailable */ }
    }

    const { data: existing, error: existingError } = await supabase.from("creator_marketplace_profiles").select("instagram_username").eq("creator_id", userId).maybeSingle();
    if (existingError) throw new Error("Your profile could not be read. Please try again.");
    const fields = instagramProfilePatch(ig, avatarPath);
    const { data: identity } = existing ? { data: null } : await supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle();
    const { error: pErr } = existing
      ? await supabase.from("creator_marketplace_profiles").update(fields).eq("creator_id", userId)
      : await supabase.from("creator_marketplace_profiles").insert({ creator_id: userId, display_name: identity?.display_name || "", ...fields });
    if (pErr) { console.error("[instagram confirm] profile", pErr); throw new Error("Your profile could not be updated. Please try again."); }

    // Reels belong to the previous account; drop them when the account changes.
    const changed = (existing?.instagram_username ?? "").replace(/^@/, "").toLowerCase() !== ig.username;
    if (changed) {
      const { error } = await supabase.from("creator_reels").delete().eq("creator_id", userId);
      if (error) { console.error("[instagram confirm] reels", error); throw new Error("Your previous account's reels could not be cleared. Please try again."); }
    }

    // Replace the social snapshot, never merge metrics from a different account.
    const metrics = { ...instagramMetrics(ig), picture_url: avatarPath };
    const { error: sErr } = await supabase.from("creator_social_accounts").upsert({
      creator_id: userId, platform: "Instagram", username: ig.username, profile_url: profileUrl, metrics,
      source_type: "profile_check", check_status: "Profile Checked", evidence_path: null, checked_at: new Date().toISOString(),
    }, { onConflict: "creator_id,platform" });
    if (sErr) { console.error("[instagram confirm] social", sErr); throw new Error("The account could not be saved. Please try again."); }
    return { username: ig.username, profileUrl, pictureSaved: !!avatarPath, reelsCleared: changed };
  });

export const checkInstagramProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { usernameOrUrl: string }) => z.object({ usernameOrUrl: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    await requireCreator(context.supabase, context.userId);
    const apiKey = process.env["GRAMSCRAPER_API_KEY"];
    const secret = process.env["INSTAGRAM_CHECK_SIGNING_SECRET"];
    if (!apiKey?.trim()) return { ok: false as const, message: "Instagram lookup is not configured. The service owner needs to set GRAMSCRAPER_API_KEY in secure backend secrets. Manual entry and screenshot evidence remain available.", code: "configuration" as const, retryAt: 0 };
    if (!secret) throw new Error("Instagram confirmation is not configured. Please contact support.");
    const { lookupInstagramProfile, signCheck, InstagramProviderError, lookupEnvironment } = await import("./instagram-profile.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const environment = lookupEnvironment(getRequest().url);
    try {
      const profile = await lookupInstagramProfile(context.userId, data.usernameOrUrl, apiKey, environment);
      return { ok: true as const, ...await signCheck(context.userId, profile, secret) };
    } catch (error) {
      if (error instanceof InstagramLookupError) return { ok: false as const, message: error.message, code: error.code, retryAt: error.retryAt };
      if (error instanceof InstagramProviderError) return { ok: false as const, message: error.message, code: error.code, retryAt: 0, status: error.status };
      throw error;
    }
  });

export const extractProfileEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { path: string; platform: string }) => z.object({ path: z.string().min(1).max(500), platform: z.string().max(20) }).parse(input))
  .handler(async ({ data, context }) => {
    await requireCreator(context.supabase, context.userId);
    if (!data.path.startsWith(`${context.userId}/`)) throw new Error("You can only use your own uploads.");
    const { data: blob, error } = await context.supabase.storage.from("creator-avatars").download(data.path);
    if (error || !blob) throw new Error("The screenshot could not be read.");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const { extractFromScreenshot } = await import("./social-summary.server");
    return extractFromScreenshot(bytes, blob.type || "image/png", data.platform);
  });
