// Social account data sources. Each source returns only values it actually has;
// unknown values stay null. A real platform integration can be added later as
// another source returning the same SocialAccountData shape.
export const NOT_AVAILABLE = "Not available";
export type SocialPlatform = "Instagram" | "TikTok" | "YouTube" | "Facebook";
export type SourceType = "profile_check" | "uploaded_evidence";
export type CheckStatus = "Profile Checked" | "Evidence Provided";

export type SocialMetrics = {
  display_name: string | null; followers: number | null; posts: number | null;
  likes: number | null; comments: number | null; views: number | null;
  reach: number | null; impressions: number | null; bio_niche: string | null;
};
export type SocialAccountData = {
  platform: SocialPlatform; username: string; profile_url: string | null;
  metrics: SocialMetrics & { following?: number | null; biography?: string | null; is_verified?: boolean | null; is_private?: boolean | null; picture_url?: string | null }; source_type: SourceType; check_status: CheckStatus;
  evidence_path?: string | null; picture_url?: string | null;
};

/** Source 3: real Instagram data returned by the lookup service. Engagement metrics aren't in this response, so they stay null. */
export function fromInstagramApi(p: { username: string; full_name: string | null; biography: string | null; profile_pic_url: string | null; follower_count: number | null; following_count: number | null; media_count: number | null; category: string | null; is_verified?: boolean | null; is_private?: boolean | null }): SocialAccountData {
  return {
    platform: "Instagram", username: p.username, profile_url: `https://www.instagram.com/${p.username}/`,
    source_type: "profile_check", check_status: "Profile Checked", picture_url: p.profile_pic_url,
    metrics: { ...emptyMetrics(), display_name: p.full_name, followers: p.follower_count, posts: p.media_count, bio_niche: p.category, following: p.following_count, biography: p.biography, is_verified: p.is_verified ?? null, is_private: p.is_private ?? null },
  };
}

export const emptyMetrics = (): SocialMetrics => ({ display_name: null, followers: null, posts: null, likes: null, comments: null, views: null, reach: null, impressions: null, bio_niche: null });
export const statusFor = (s: SourceType): CheckStatus => (s === "uploaded_evidence" ? "Evidence Provided" : "Profile Checked");

const num = (v: unknown) => { const n = Number(v); return v !== "" && v != null && Number.isFinite(n) && n >= 0 ? n : null; };

/** Source 1: profile information the app already holds for this creator. */
export function fromProfileInfo(input: {
  platform: SocialPlatform; username: string; profile_url: string; display_name: string; followers: string; niche: string;
  reels: Array<{ url: string; views: string; likes: string; comments: string }>;
}): SocialAccountData {
  const reels = input.reels.filter((r) => r.url.trim());
  const total = (k: "views" | "likes" | "comments") => (reels.length ? reels.reduce((s, r) => s + (num(r[k]) ?? 0), 0) : null);
  return {
    platform: input.platform, username: input.username.replace(/^@/, "").trim(), profile_url: input.profile_url.trim() || null,
    source_type: "profile_check", check_status: "Profile Checked",
    metrics: { ...emptyMetrics(), display_name: input.display_name.trim() || null, followers: num(input.followers), posts: reels.length || null, likes: total("likes"), comments: total("comments"), views: total("views"), bio_niche: input.niche.trim() || null },
  };
}

/** Source 2: values the AI read from an uploaded screenshot. */
export function fromEvidence(base: { platform: SocialPlatform; username: string; profile_url: string }, extracted: Partial<SocialMetrics> & { username?: string | null }, path: string): SocialAccountData {
  const m = emptyMetrics();
  (Object.keys(m) as (keyof SocialMetrics)[]).forEach((k) => {
    const v = extracted[k];
    (m as Record<string, unknown>)[k] = k === "display_name" || k === "bio_niche" ? (typeof v === "string" && v.trim() ? v.trim() : null) : num(v);
  });
  return { platform: base.platform, username: (extracted.username || base.username).replace(/^@/, "").trim(), profile_url: base.profile_url.trim() || null, metrics: m, source_type: "uploaded_evidence", check_status: "Evidence Provided", evidence_path: path };
}

/** Rows for the account card / AI input. Reach & impressions appear only when present. */
export function displayRows(d: SocialAccountData): Array<[string, string]> {
  const yt = d.platform === "YouTube";
  const f = (n: number | null) => (n == null ? NOT_AVAILABLE : n.toLocaleString("en-IN"));
  const rows: Array<[string, string]> = [
    ["Platform", d.platform], ["Username", d.username ? `@${d.username}` : NOT_AVAILABLE], ["Display name", d.metrics.display_name ?? NOT_AVAILABLE],
    ["Profile URL", d.profile_url ?? NOT_AVAILABLE], [yt ? "Subscribers" : "Followers", f(d.metrics.followers)], [yt ? "Videos" : "Posts", f(d.metrics.posts)],
    ["Visible likes", f(d.metrics.likes)], ["Visible comments", f(d.metrics.comments)], ["Visible views", f(d.metrics.views)], ["Bio/niche", d.metrics.bio_niche ?? NOT_AVAILABLE],
  ];
  if (d.metrics.following != null) rows.splice(5, 0, ["Following", f(d.metrics.following)]);
  if (d.metrics.biography) rows.push(["Bio", d.metrics.biography]);
  if (d.metrics.is_verified != null) rows.push(["Instagram verification", d.metrics.is_verified ? "Verified on Instagram" : "Not verified on Instagram"]);
  if (d.metrics.reach != null) rows.push(["Reach", f(d.metrics.reach)]);
  if (d.metrics.impressions != null) rows.push(["Impressions", f(d.metrics.impressions)]);
  return rows;
}
