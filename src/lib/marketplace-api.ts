import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type CreatorMarketplaceProfile = Database["public"]["Tables"]["creator_marketplace_profiles"]["Row"];
export type CreatorMarketplaceEvidence = Database["public"]["Tables"]["creator_marketplace_evidence"]["Row"];
export type BusinessCampaign = Database["public"]["Tables"]["business_campaigns"]["Row"];
export type MarketplaceConnection = Database["public"]["Tables"]["marketplace_connections"]["Row"];
export type ConnectionStatus = Database["public"]["Enums"]["connection_status"];

export const FOLLOWER_RANGES = ["Under 1,000", "1,000–9,999", "10,000–49,999", "50,000–99,999", "100,000+"] as const;
export const FOLLOWER_RANGE_BOUNDS: Record<string, [number, number | null]> = { "Under 1,000": [0, 999], "1,000–9,999": [1000, 9999], "10,000–49,999": [10000, 49999], "50,000–99,999": [50000, 99999], "100,000+": [100000, null] };
export const CONTENT_TYPES = ["Short-form video", "Long-form video", "Photography", "Written content", "Live content"] as const;
export const PLATFORMS = ["Instagram", "TikTok", "YouTube", "LinkedIn", "Other"] as const;

export async function getMyMarketplaceProfile() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("You are not signed in.");
  const [{ data: profile, error }, { data: evidence, error: evidenceError }] = await Promise.all([
    supabase.from("creator_marketplace_profiles").select("*").eq("creator_id", auth.user.id).maybeSingle(),
    supabase.from("creator_marketplace_evidence").select("*").eq("creator_id", auth.user.id).order("position"),
  ]);
  if (error) throw error;
  if (evidenceError) throw evidenceError;
  return { profile, evidence: evidence ?? [] };
}

export async function saveMarketplaceProfile(input: {
  display_name: string; instagram_username: string; profile_link: string; niche: string; location: string;
  languages: string[]; content_types: string[]; follower_range: string; status: "draft" | "submitted"; avatar_url?: string | null; follower_count?: number | null;
  evidence: Array<{ evidence_text: string; evidence_link: string; evidence_date: string }>;
}) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("You are not signed in.");
  const creatorId = auth.user.id;
  const { error } = await supabase.from("creator_marketplace_profiles").upsert({
    creator_id: creatorId,
    display_name: input.display_name,
    instagram_username: input.instagram_username || null,
    profile_link: input.profile_link || null,
    niche: input.niche || null,
    location: input.location || null,
    languages: input.languages,
    content_types: input.content_types,
    follower_range: input.follower_range || null,
    status: input.status,
    avatar_url: input.avatar_url ?? null,
    follower_count: input.follower_count ?? null,
  });
  if (error) throw error;
  const { error: deleteError } = await supabase.from("creator_marketplace_evidence").delete().eq("creator_id", creatorId);
  if (deleteError) throw deleteError;
  const rows = input.evidence.filter((item) => item.evidence_text.trim()).map((item, position) => ({
    creator_id: creatorId,
    evidence_text: item.evidence_text.trim(),
    evidence_link: item.evidence_link.trim() || null,
    evidence_date: item.evidence_date || null,
    position,
  }));
  if (rows.length) {
    const { error: insertError } = await supabase.from("creator_marketplace_evidence").insert(rows);
    if (insertError) throw insertError;
  }
}

export async function listCreators(filters?: { location?: string; niche?: string; language?: string; contentType?: string; followerRange?: string }) {
  let query = supabase.from("creator_marketplace_profiles").select("*").eq("status", "submitted").order("updated_at", { ascending: false });
  if (filters?.location) query = query.ilike("location", filters.location);
  if (filters?.niche) query = query.ilike("niche", filters.niche);
  if (filters?.language) query = query.contains("languages", [filters.language]);
  if (filters?.contentType) query = query.contains("content_types", [filters.contentType]);
  if (filters?.followerRange) { const [min, max] = FOLLOWER_RANGE_BOUNDS[filters.followerRange] ?? [0, null]; query = query.gte("follower_count", min); if (max != null) query = query.lte("follower_count", max); }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getCreatorProfile(creatorId: string) {
  const [{ data: profile, error }, { data: evidence, error: evidenceError }] = await Promise.all([
    supabase.from("creator_marketplace_profiles").select("*").eq("creator_id", creatorId).single(),
    supabase.from("creator_marketplace_evidence").select("*").eq("creator_id", creatorId).order("position"),
  ]);
  if (error) throw error;
  if (evidenceError) throw evidenceError;
  return { profile, evidence: evidence ?? [] };
}

export async function listCampaigns() {
  const { data, error } = await supabase.from("business_campaigns").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createCampaign(input: Omit<BusinessCampaign, "id" | "business_id" | "created_at" | "updated_at" | "business_label" | "title"> & { title?: string | null }) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("You are not signed in.");
  const { data, error } = await supabase.from("business_campaigns").insert({ ...input, business_id: auth.user.id }).select().single();
  if (error) throw error;
  return data;
}

export async function listShortlist() {
  const { data, error } = await supabase.from("business_shortlists").select("*").order("created_at");
  if (error) throw error;
  return data;
}

export async function addToShortlist(creatorId: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("You are not signed in.");
  const { error } = await supabase.from("business_shortlists").insert({ business_id: auth.user.id, creator_id: creatorId });
  if (error) throw error;
}

export async function removeFromShortlist(creatorId: string) {
  const { error } = await supabase.from("business_shortlists").delete().eq("creator_id", creatorId);
  if (error) throw error;
}

export async function sendConnection(creatorId: string, campaignId: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("You are not signed in.");
  const { error } = await supabase.from("marketplace_connections").insert({ creator_id: creatorId, campaign_id: campaignId, business_id: auth.user.id });
  if (error) throw error;
}

type ConnectionRow = { business_id: string } & Record<string, unknown>;
type NamedConnectionRow<T> = T & { business_name: string | null };

async function withBusinessNames<T extends ConnectionRow>(rows: T[]): Promise<NamedConnectionRow<T>[]> {
  const ids = [...new Set(rows.map((row) => row.business_id))];
  if (!ids.length) return rows.map((row) => ({ ...row, business_name: null }));
  const { data } = await supabase.from("profiles").select("id, display_name").in("id", ids);
  const names = new Map((data ?? []).map((profile) => [profile.id, profile.display_name]));
  return rows.map((row) => Object.assign({}, row, { business_name: names.get(row.business_id) ?? null }));
}

export async function listConnections() {
  const { data, error } = await supabase.from("marketplace_connections").select("*, business_campaigns(*), creator_marketplace_profiles(display_name, avatar_url), campaign_bids(amount)").order("created_at", { ascending: false });
  if (error) throw error;
  return withBusinessNames(data ?? []);
}

export async function getConnection(id: string) {
  const { data, error } = await supabase.from("marketplace_connections").select("*, business_campaigns(*), creator_marketplace_profiles(display_name, avatar_url), campaign_bids(amount)").eq("id", id).single();
  if (error) throw error;
  const [row] = await withBusinessNames([data]);
  return row;
}

export async function respondToConnection(id: string, decision: "accepted" | "declined") {
  const { error } = await supabase.rpc("respond_to_marketplace_connection", { _connection_id: id, _decision: decision });
  if (error) throw error;
}

export async function confirmConnection(id: string) {
  const { error } = await supabase.rpc("confirm_marketplace_connection", { _connection_id: id });
  if (error) throw error;
}
export async function listAvailableCampaigns() {
  const { data, error } = await supabase.rpc("list_available_campaigns");
  if (error) throw error;
  return data ?? [];
}

// ---- Bids, reels and profile images ----
export type CreatorReel = Database["public"]["Tables"]["creator_reels"]["Row"];
export type CampaignBid = Database["public"]["Tables"]["campaign_bids"]["Row"];
export type BidStatus = Database["public"]["Enums"]["bid_status"];
export const AVATAR_BUCKET = "creator-avatars";

export function reelStats(reels: Pick<CreatorReel, "views" | "posted_date" | "created_at">[]) {
  const sorted = [...reels].sort((a, b) => (b.posted_date ?? b.created_at).localeCompare(a.posted_date ?? a.created_at));
  const views = reels.map((r) => r.views);
  return {
    averageViews: views.length ? Math.round(views.reduce((s, v) => s + v, 0) / views.length) : null,
    highestViews: views.length ? Math.max(...views) : null,
    recent: sorted.slice(0, 3).map((r) => r.views),
  };
}
export const formatCount = (n?: number | null) => (n == null ? "Not provided" : n >= 1000 ? `${Math.round(n / 100) / 10}K` : String(n));
export const formatInr = (n?: number | string | null) => (n == null || n === "" ? "Not provided" : `₹${Number(n).toLocaleString("en-IN")}`);

export async function getAvatarUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  const { data, error } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function uploadAvatar(file: File) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("You are not signed in.");
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Image must be 5 MB or smaller.");
  const path = `${auth.user.id}/avatar-${Date.now()}.${file.name.split(".").pop() || "jpg"}`;
  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return path;
}

export async function listReels(creatorIds: string[]) {
  if (!creatorIds.length) return [] as CreatorReel[];
  const { data, error } = await supabase.from("creator_reels").select("*").in("creator_id", creatorIds);
  if (error) throw error;
  return data;
}

export async function saveMyReels(reels: Array<{ url: string; views: string; likes: string; comments: string; posted_date: string }>) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("You are not signed in.");
  const { error: delError } = await supabase.from("creator_reels").delete().eq("creator_id", auth.user.id);
  if (delError) throw delError;
  const rows = reels.filter((r) => r.url.trim()).map((r) => ({
    creator_id: auth.user!.id, url: r.url.trim(), views: Number(r.views) || 0, likes: Number(r.likes) || 0,
    comments: Number(r.comments) || 0, posted_date: r.posted_date || null,
  }));
  if (rows.length) { const { error } = await supabase.from("creator_reels").insert(rows); if (error) throw error; }
}

export async function listOpenCampaigns() {
  const { data, error } = await supabase.rpc("list_open_campaigns");
  if (error) throw error;
  return data ?? [];
}

export async function listMyBids() {
  const { data, error } = await supabase.from("campaign_bids").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function submitBid(campaignId: string, amount: number, maximumBudget: number | null) {
  if (maximumBudget != null && amount > maximumBudget) throw new Error(`Your bid cannot be more than ${formatInr(maximumBudget)}.`);
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("You are not signed in.");
  const { error } = await supabase.from("campaign_bids").insert({ campaign_id: campaignId, creator_id: auth.user.id, amount });
  if (error) throw new Error(error.message.includes("creator_marketplace_profiles") ? "Save your marketplace profile before bidding." : error.message);
}

export async function listBidsWithCreators() {
  const { data, error } = await supabase.from("campaign_bids").select("*, creator_marketplace_profiles(creator_id, display_name, instagram_username, avatar_url, follower_count, follower_range)").order("created_at");
  if (error) throw error;
  return data;
}

export async function selectBid(bidId: string) {
  const { error } = await supabase.rpc("select_campaign_bid", { _bid_id: bidId });
  if (error) throw error;
}
