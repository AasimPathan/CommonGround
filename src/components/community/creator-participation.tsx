import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getMyIdentity } from "@/lib/community-api";
import { ExternalLink, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { CreatorAvatar } from "@/components/marketplace/marketplace-extras";
import { formatCount } from "@/lib/marketplace-api";
import { ScreenState } from "./core";

async function listParticipants(id: string) {
  const { data, error } = await supabase.rpc("list_initiative_participants", { _initiative_id: id });
  if (error) throw error;
  const { data: st } = await supabase.rpc("list_participation_content_status", { _initiative_id: id });
  const map = new Map((st ?? []).map((r) => [r.participation_id, r.content_status]));
  return (data ?? []).map((p) => ({ ...p, content_status: map.get(p.participation_id) ?? null }));
}
const CONTENT_LABEL: Record<string, string> = { pending: "Video pending review", approved: "Video approved", changes_required: "Video changes required" };

/** Participation is read-only; reviewers may only review submitted video content. */
export function CreatorParticipation({ initiativeId }: { initiativeId: string }) {
  const q = useQuery({ queryKey: ["initiative-participants", initiativeId], queryFn: () => listParticipants(initiativeId) });
  const qc = useQueryClient();
  const identity = useQuery({ queryKey: ["identity"], queryFn: getMyIdentity });
  const isReviewer = identity.data?.roles.includes("reviewer");
  const review = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "approved" | "changes_required" }) => { const { error } = await supabase.rpc("review_participation_content", { _participation_id: id, _decision: decision }); if (error) throw error; },
    onSuccess: () => { toast.success("Video review saved"); qc.invalidateQueries({ queryKey: ["initiative-participants", initiativeId] }); qc.invalidateQueries({ queryKey: ["awareness-videos", initiativeId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const show = (v: string | null | undefined) => v || "Not provided";
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-accent text-primary"><UsersRound className="size-5" /></span>
        <div><h2 className="text-xl font-semibold">Creator Participation</h2><p className="text-sm text-muted-foreground">{q.data ? `${q.data.length} ${q.data.length === 1 ? "Creator" : "Creators"} Participated` : "Read-only"}</p></div>
      </div>
      {q.isLoading ? <ScreenState kind="loading" title="Loading participation" /> : q.isError ? <ScreenState kind="error" title="Participation could not be loaded" /> : !q.data?.length ? <ScreenState kind="empty" title="No creators have participated yet" /> : (
        <div className="grid gap-3">
          {q.data.map((p) => (
            <Card key={p.participation_id} className="shadow-none"><CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <CreatorAvatar path={p.avatar_url} name={p.display_name} className="size-12" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{show(p.display_name)}</p><Badge variant="secondary">{p.status === "completed" ? "Content submitted" : "Supported"}</Badge>{p.content_status && <Badge variant={p.content_status === "approved" ? "default" : "outline"}>{CONTENT_LABEL[p.content_status]}</Badge>}</div>
                <p className="text-sm text-muted-foreground">{p.instagram_username ? `@${p.instagram_username.replace(/^@/, "")}` : "Instagram not provided"} · {show(p.niche)} · {show(p.location)} · {p.follower_count != null ? `${formatCount(p.follower_count)} followers` : "Followers not provided"}</p>
                <p className="mt-1 text-xs text-muted-foreground">Participated {new Date(p.supported_at).toLocaleDateString()}{p.completed_at ? ` · Content ${new Date(p.completed_at).toLocaleDateString()}` : ""}</p>
              </div>
              {p.content_url ? <Button asChild variant="outline" size="sm"><a href={p.content_url} target="_blank" rel="noopener noreferrer">View Content<ExternalLink /></a></Button> : <span className="text-xs text-muted-foreground">No content yet</span>}
              {isReviewer && p.content_status === "pending" && <div className="flex gap-2"><Button size="sm" disabled={review.isPending} onClick={() => review.mutate({ id: p.participation_id, decision: "approved" })}>Approve video</Button><Button size="sm" variant="outline" disabled={review.isPending} onClick={() => review.mutate({ id: p.participation_id, decision: "changes_required" })}>Request changes</Button></div>}
            </CardContent></Card>
          ))}
        </div>
      )}
    </section>
  );
}
