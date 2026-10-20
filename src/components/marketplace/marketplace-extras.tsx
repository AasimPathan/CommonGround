import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Minus, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatCount, formatInr, getAvatarUrl, listBidsWithCreators, listReels, reelStats, selectBid, submitBid,
  type BidStatus, type CreatorMarketplaceProfile, type CreatorReel,
} from "@/lib/marketplace-api";
import { cn } from "@/lib/utils";

export const ANALYTICS_LABEL = "Creator-provided performance data";
const BID_LABEL: Record<BidStatus, string> = { submitted: "Submitted", selected: "Selected", not_selected: "Not Selected" };

export function BidStatusBadge({ status }: { status: BidStatus }) {
  return <Badge variant={status === "selected" ? "default" : status === "not_selected" ? "outline" : "secondary"}>{BID_LABEL[status]}</Badge>;
}

export function useAvatarUrl(path?: string | null) {
  return useQuery({ queryKey: ["avatar-url", path], queryFn: () => getAvatarUrl(path!), enabled: !!path, staleTime: 30 * 60 * 1000 });
}

export function CreatorAvatar({ path, name, className }: { path?: string | null; name?: string | null; className?: string }) {
  const url = useAvatarUrl(path);
  const initials = (name || "?").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return <div className={cn("grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-accent text-sm font-semibold text-primary", className)}>{url.data ? <img src={url.data} alt={name ? `${name} profile` : "Creator profile"} className="size-full object-cover" /> : initials}</div>;
}

export function useReelsMap(ids: string[]) {
  const q = useQuery({ queryKey: ["creator-reels", [...ids].sort()], queryFn: () => listReels(ids), enabled: ids.length > 0 });
  const map = new Map<string, CreatorReel[]>();
  q.data?.forEach((r) => map.set(r.creator_id, [...(map.get(r.creator_id) ?? []), r]));
  return map;
}

export function ReelStatsBlock({ reels }: { reels: CreatorReel[] }) {
  const s = reelStats(reels);
  return <div className="space-y-3"><p className="text-xs font-bold uppercase text-muted-foreground">{ANALYTICS_LABEL}</p><dl className="grid grid-cols-2 gap-3"><div><dt className="text-xs text-muted-foreground">Average views</dt><dd className="text-lg font-semibold">{formatCount(s.averageViews)}</dd></div><div><dt className="text-xs text-muted-foreground">Highest views</dt><dd className="text-lg font-semibold">{formatCount(s.highestViews)}</dd></div></dl><div><p className="text-xs text-muted-foreground">Recent reel views</p><p className="mt-1 text-sm font-medium">{s.recent.length ? s.recent.map(formatCount).join(" · ") : "Not provided"}</p></div></div>;
}

export function FlipCreatorCard({ creator, reels, bid, children }: { creator: CreatorMarketplaceProfile; reels: CreatorReel[]; bid?: number | null; children: React.ReactNode }) {
  const [flipped, setFlipped] = useState(false);
  const url = useAvatarUrl(creator.avatar_url);
  const followers = creator.follower_count != null ? formatCount(creator.follower_count) : creator.follower_range || "Not provided";
  const initials = (creator.display_name || "?").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const toggle = (e: { target: EventTarget | null }) => { if (!(e.target as HTMLElement | null)?.closest("a,button")) setFlipped((f) => !f); };
  return <div className="group [perspective:1200px]">
    <div tabIndex={0} aria-pressed={flipped} aria-label={`Show performance data for ${creator.display_name}`}
      onClick={toggle} onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !((e.target as HTMLElement).closest("a,button"))) { e.preventDefault(); setFlipped((f) => !f); } }}
      className={cn("relative aspect-[9/16] cursor-pointer rounded-lg transition-transform duration-300 ease-out [transform-style:preserve-3d] focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none md:group-hover:[transform:rotateY(180deg)]", flipped && "[transform:rotateY(180deg)]")}>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 [backface-visibility:hidden]">
        {url.data ? <img src={url.data} alt={creator.display_name ? `${creator.display_name} profile` : "Creator profile"} className="size-[150px] rounded-full object-cover" /> : <div className="grid size-[150px] place-items-center rounded-full bg-accent text-5xl font-semibold text-primary">{initials}</div>}
        <p className="max-w-full truncate px-3 text-center text-lg font-semibold">{creator.display_name || "Not provided"}</p>
      </div>
      <div className="absolute inset-0 flex flex-col overflow-y-auto rounded-lg border border-border bg-card p-5 [backface-visibility:hidden] [transform:rotateY(180deg)]">
        <div className="flex items-center gap-3"><CreatorAvatar path={creator.avatar_url} name={creator.display_name} className="size-12" /><div className="min-w-0"><h2 className="truncate font-semibold">{creator.display_name || "Not provided"}</h2><p className="truncate text-sm text-muted-foreground">{creator.instagram_username ? `@${creator.instagram_username.replace(/^@/, "")}` : "Not provided"}</p></div></div>
        <dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Niche</dt><dd className="text-right font-medium">{creator.niche || "Not provided"}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Location</dt><dd className="text-right font-medium">{creator.location || "Not provided"}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Followers</dt><dd className="text-right font-medium">{followers}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Bid</dt><dd className="text-right font-medium">{bid != null ? formatInr(bid) : "No bid"}</dd></div></dl>
        <div className="mt-4"><ReelStatsBlock reels={reels} /></div>
        <div className="mt-auto flex flex-wrap gap-2 pt-4">{children}</div>
      </div>
    </div>
  </div>;
}

export function BidForm({ campaignId, maximumBudget }: { campaignId: string; maximumBudget: number | null }) {
  const qc = useQueryClient(); const [amount, setAmount] = useState("");
  const value = Number(amount); const over = maximumBudget != null && value > maximumBudget;
  const m = useMutation({ mutationFn: () => submitBid(campaignId, value, maximumBudget), onSuccess: () => qc.invalidateQueries({ queryKey: ["my-bids"] }) });
  if (maximumBudget == null) return <p className="text-sm text-muted-foreground">Bids are not open — this campaign has no maximum budget.</p>;
  return <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}><Label className="grid gap-2"><span>Your bid (₹)</span><div className="flex gap-2"><Input type="number" min={1} max={maximumBudget} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Up to ${maximumBudget}`} /><Button type="submit" disabled={!value || value <= 0 || over || m.isPending}>Submit bid</Button></div></Label>{over && <p className="text-sm text-destructive">Your bid cannot be more than the maximum budget of {formatInr(maximumBudget)}.</p>}{m.isError && <p className="text-sm text-destructive">{m.error instanceof Error ? m.error.message : "The bid could not be submitted."}</p>}</form>;
}

export function CampaignBids({ campaignId }: { campaignId: string }) {
  const qc = useQueryClient();
  const bids = useQuery({ queryKey: ["campaign-bids"], queryFn: listBidsWithCreators });
  const list = bids.data?.filter((b) => b.campaign_id === campaignId) ?? [];
  const reels = useReelsMap(list.map((b) => b.creator_id));
  const select = useMutation({ mutationFn: selectBid, onSuccess: () => { qc.invalidateQueries({ queryKey: ["campaign-bids"] }); qc.invalidateQueries({ queryKey: ["marketplace-connections"] }); } });
  const decided = list.some((b) => b.status === "selected");
  return <div className="mt-5 border-t border-border pt-5"><h3 className="font-semibold">Creator bids</h3><p className="text-xs text-muted-foreground">Listed in the order received. Choose a creator yourself — bids are not ranked.</p>{!list.length ? <p className="mt-3 text-sm text-muted-foreground">No bids yet.</p> : <ul className="mt-3 divide-y divide-border">{list.map((b) => { const c = b.creator_marketplace_profiles; const s = reelStats(reels.get(b.creator_id) ?? []); return <li key={b.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center"><div className="flex flex-1 items-center gap-3"><CreatorAvatar path={c?.avatar_url} name={c?.display_name} className="size-10" /><div className="min-w-0"><p className="truncate font-medium">{c?.display_name ?? "Creator"}</p><p className="text-xs text-muted-foreground">{c?.follower_count != null ? formatCount(c.follower_count) : c?.follower_range || "Not provided"} followers · avg {formatCount(s.averageViews)} views</p></div></div><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{formatInr(b.amount)}</span><BidStatusBadge status={b.status} /><Button asChild size="sm" variant="outline"><Link to="/business/discover/$creatorId" params={{ creatorId: b.creator_id }}>View Profile</Link></Button>{!decided && <Button size="sm" disabled={select.isPending} onClick={() => select.mutate(b.id)}><Check />Select</Button>}</div></li>; })}</ul>}{select.isError && <p className="mt-2 text-sm text-destructive">{select.error instanceof Error ? select.error.message : "Selection failed."}</p>}</div>;
}

export type ReelDraft = { url: string; views: string; likes: string; comments: string; posted_date: string };
export function ReelsEditor({ reels, onChange }: { reels: ReelDraft[]; onChange: (r: ReelDraft[]) => void }) {
  const upd = (i: number, k: keyof ReelDraft, v: string) => onChange(reels.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const s = reelStats(reels.filter((r) => r.url.trim()).map((r) => ({ views: Number(r.views) || 0, posted_date: r.posted_date || null, created_at: "" })));
  return <section className="space-y-4"><div className="flex items-center justify-between"><div><h2 className="text-xl font-semibold">Reels</h2><p className="text-sm text-muted-foreground">{ANALYTICS_LABEL} · average {formatCount(s.averageViews)} · highest {formatCount(s.highestViews)}</p></div><Button type="button" variant="outline" size="sm" onClick={() => onChange([...reels, { url: "", views: "", likes: "", comments: "", posted_date: "" }])}><Plus />Add reel</Button></div>{reels.length ? reels.map((r, i) => <div key={i} className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-6"><Label className="grid gap-2 sm:col-span-2"><span>Reel URL</span><Input type="url" value={r.url} onChange={(e) => upd(i, "url", e.target.value)} /></Label><Label className="grid gap-2"><span>Views</span><Input type="number" min={0} value={r.views} onChange={(e) => upd(i, "views", e.target.value)} /></Label><Label className="grid gap-2"><span>Likes</span><Input type="number" min={0} value={r.likes} onChange={(e) => upd(i, "likes", e.target.value)} /></Label><Label className="grid gap-2"><span>Comments</span><Input type="number" min={0} value={r.comments} onChange={(e) => upd(i, "comments", e.target.value)} /></Label><Label className="grid gap-2"><span>Posted date</span><Input type="date" value={r.posted_date} onChange={(e) => upd(i, "posted_date", e.target.value)} /></Label><Button type="button" variant="ghost" size="sm" className="justify-self-start" onClick={() => onChange(reels.filter((_, j) => j !== i))}><Minus />Remove</Button></div>) : <p className="text-sm text-muted-foreground">No reels added.</p>}</section>;
}
