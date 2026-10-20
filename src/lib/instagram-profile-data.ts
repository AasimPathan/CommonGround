export type InstagramProfile = {
  username: string; full_name: string | null; biography: string | null; profile_pic_url: string | null;
  follower_count: number | null; following_count: number | null; media_count: number | null;
  category: string | null; is_private: boolean | null; is_verified: boolean | null;
};

const number = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
const string = (v: unknown) => typeof v === "string" && v.trim() ? v.trim() : null;
const record = (v: unknown): Record<string, unknown> | null => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : null;

export function normalizeHandle(input: string): string | null {
  const text = input.trim();
  let handle = text.replace(/^@/, "");
  if (/^(https?:\/\/|(?:www\.)?instagram\.com\/)/i.test(text)) {
    try {
      const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
      if (!["instagram.com", "www.instagram.com"].includes(url.hostname.toLowerCase())) return null;
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length !== 1) return null;
      handle = parts[0] ?? "";
    } catch { return null; }
  }
  if (["p", "reel", "reels", "stories", "explore", "accounts"].includes(handle.toLowerCase())) return null;
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? handle.toLowerCase() : null;
}

/** The provider documents both a direct response and a data envelope. */
export function parseInstagramProfile(body: unknown, wanted: string): InstagramProfile {
  const root = record(body);
  const data = record(root?.["data"]) ?? root;
  if (!data || typeof data["username"] !== "string") throw new Error("GramScraper couldn't return this profile. Check the username or use manual entry or screenshot evidence.");
  const username = normalizeHandle(data["username"]);
  if (username !== wanted) throw new Error("GramScraper returned a different account. Please check the username.");
  const privateProfile = typeof data["is_private"] === "boolean" ? data["is_private"] : null;
  if (privateProfile) throw new Error("This Instagram profile is private. Use manual entry or upload profile evidence instead.");
  return {
    username, full_name: string(data["full_name"]), biography: string(data["biography"]),
    // Prefer the full-size picture; the standard one is only ~150px and looks blurry on large cards.
    profile_pic_url: string(record(data["hd_profile_pic_url_info"])?.["url"]) ?? string(data["profile_pic_url_hd"]) ?? string(data["profile_pic_url"]),
    follower_count: number(data["follower_count"]),
    following_count: number(data["following_count"]), media_count: number(data["media_count"]),
    category: string(data["category"]), is_private: privateProfile,
    is_verified: typeof data["is_verified"] === "boolean" ? data["is_verified"] : null,
  };
}

export function instagramProfilePatch(profile: InstagramProfile, avatarPath: string | null) {
  return {
    instagram_username: profile.username, profile_link: `https://www.instagram.com/${profile.username}/`,
    ...(profile.follower_count !== null ? { follower_count: profile.follower_count } : {}),
    ...(avatarPath ? { avatar_url: avatarPath } : {}),
  };
}

export function instagramMetrics(profile: InstagramProfile) {
  return { display_name: profile.full_name, followers: profile.follower_count, following: profile.following_count,
    posts: profile.media_count, likes: null, comments: null, views: null, reach: null, impressions: null,
    bio_niche: profile.category, biography: profile.biography, is_verified: profile.is_verified, is_private: profile.is_private };
}