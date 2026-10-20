import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { CreatorAvatar } from "@/components/marketplace/marketplace-extras";
import { Badge } from "@/components/ui/badge";
import { getMyIdentity } from "@/lib/community-api";
import { PageHeader, ScreenState } from "./core";

async function listAwarenessVideos(id: string) {
  const { data, error } = await supabase.rpc("list_awareness_videos", { _initiative_id: id });
  if (error) throw error;
  return data ?? [];
}

/** Approved creator videos only. Read-only for every role. */
export function AwarenessVideos({ initiativeId, initiativeTitle }: { initiativeId: string; initiativeTitle?: string }) {
  const q = useQuery({ queryKey: ["awareness-videos", initiativeId], queryFn: () => listAwarenessVideos(initiativeId) });
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-accent text-primary"><PlayCircle className="size-5" /></span>
        <h2 className="text-xl font-semibold">Awareness Videos ({q.data?.length ?? 0})</h2>
      </div>
      {q.isLoading ? <ScreenState kind="loading" title="Loading videos" /> : q.isError ? <ScreenState kind="error" title="Videos could not be loaded" /> : !q.data?.length ? <ScreenState kind="empty" title="No approved videos yet" /> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {q.data.map((v) => (
            <Card key={v.participation_id} className="shadow-none"><CardContent className="flex items-center gap-3 p-4">
              <CreatorAvatar path={v.avatar_url} name={v.display_name} className="size-11" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{v.display_name || "Creator"}</p>
                <p className="truncate text-sm text-muted-foreground">{v.instagram_username ? `@${v.instagram_username.replace(/^@/, "")}` : "Instagram not provided"}</p>
                {initiativeTitle && <p className="truncate text-xs text-muted-foreground">{initiativeTitle}</p>}
                <a href={v.content_url ?? "#"} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-primary hover:underline">{v.content_url}</a>
              </div>
              <Button asChild variant="outline" size="sm"><a href={v.content_url ?? "#"} target="_blank" rel="noopener noreferrer">Watch<ExternalLink /></a></Button>
            </CardContent></Card>
          ))}
        </div>
      )}
    </section>
  );
}

async function listMyApprovedVideos() {
  const { data, error } = await supabase.from("participations").select("id, content_url, content_status, completed_at, initiatives(title)").eq("content_status", "approved").order("content_reviewed_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Creator's own approved videos. */
export function MyAwarenessVideosPage() {
  const identity = useQuery({ queryKey: ["identity"], queryFn: getMyIdentity });
  const q = useQuery({ queryKey: ["my-awareness-videos"], queryFn: listMyApprovedVideos });
  const name = identity.data?.profile?.display_name ?? "You";
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Community" title="Awareness Video" description="Your awareness videos approved by a reviewer." />
      {q.isLoading ? <ScreenState kind="loading" title="Loading videos" /> : q.isError ? <ScreenState kind="error" title="Videos could not be loaded" /> : !q.data?.length ? <ScreenState kind="empty" title="No approved videos yet" description="Submit a content URL on an initiative you support. It appears here once approved." /> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(q.data ?? []).map((v) => (
            <Card key={v.id} className="shadow-none"><CardContent className="space-y-2 p-5">
              <div className="flex items-center justify-between gap-2"><p className="truncate font-semibold">{v.initiatives?.title ?? "Initiative"}</p><Badge>Approved</Badge></div>
              <p className="text-sm text-muted-foreground">{name}</p>
              <a href={v.content_url ?? "#"} target="_blank" rel="noopener noreferrer" className="block truncate text-sm text-primary hover:underline">{v.content_url}</a>
              <Button asChild variant="outline" size="sm"><a href={v.content_url ?? "#"} target="_blank" rel="noopener noreferrer">Watch<ExternalLink /></a></Button>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}

/** Reviewer queue of submitted videos awaiting review. */
export function PendingVideoQueue() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["pending-awareness-videos"], queryFn: async () => { const { data, error } = await supabase.rpc("list_pending_awareness_videos"); if (error) throw error; return data ?? []; } });
  const review = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "approved" | "changes_required" }) => { const { error } = await supabase.rpc("review_participation_content", { _participation_id: id, _decision: decision }); if (error) throw error; },
    onSuccess: () => { toast.success("Video review saved"); qc.invalidateQueries({ queryKey: ["pending-awareness-videos"] }); qc.invalidateQueries({ queryKey: ["awareness-videos"] }); qc.invalidateQueries({ queryKey: ["initiative-participants"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-accent text-primary"><PlayCircle className="size-5" /></span>
        <h2 className="text-xl font-semibold">Awareness videos to review ({q.data?.length ?? 0})</h2>
      </div>
      {q.isLoading ? <ScreenState kind="loading" title="Loading videos" /> : q.isError ? <ScreenState kind="error" title="Videos could not be loaded" /> : !q.data?.length ? <ScreenState kind="empty" title="No videos waiting for review" /> : (
        <div className="grid gap-3">
          {q.data.map((v) => (
            <Card key={v.participation_id} className="shadow-none"><CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <CreatorAvatar path={v.avatar_url} name={v.display_name} className="size-11" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{v.display_name || "Creator"}</p>
                <p className="truncate text-sm text-muted-foreground">{v.initiative_title}{v.instagram_username ? ` · @${v.instagram_username.replace(/^@/, "")}` : ""}</p>
                <a href={v.content_url ?? "#"} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-primary hover:underline">{v.content_url}</a>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm"><a href={v.content_url ?? "#"} target="_blank" rel="noopener noreferrer">Watch<ExternalLink /></a></Button>
                <Button size="sm" disabled={review.isPending} onClick={() => review.mutate({ id: v.participation_id, decision: "approved" })}>Approve video</Button>
                <Button size="sm" variant="outline" disabled={review.isPending} onClick={() => review.mutate({ id: v.participation_id, decision: "changes_required" })}>Request changes</Button>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </section>
  );
}
