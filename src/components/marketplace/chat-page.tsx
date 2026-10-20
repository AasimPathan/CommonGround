import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { ArrowLeft, Check, CheckCheck, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScreenState } from "@/components/community/core";
import { CreatorAvatar } from "@/components/marketplace/marketplace-extras";

async function openConversation(connectionId: string) {
  const { data, error } = await supabase.rpc("open_marketplace_conversation", { _connection_id: connectionId });
  if (error) throw error;
  const row = data?.[0];
  if (!row) throw new Error("Conversation not found");
  const { data: auth } = await supabase.auth.getUser();
  const { data: conn } = await supabase.from("marketplace_connections").select("business_campaigns(title, platform, niche)").eq("id", connectionId).maybeSingle();
  const camp = conn?.business_campaigns;
  const campaign = camp ? camp.title || `${camp.platform} · ${camp.niche}` : "Campaign";
  return { ...row, campaign, me: auth.user?.id ?? "" };
}

export function ChatPage({ connectionId }: { connectionId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const convo = useQuery({ queryKey: ["chat", connectionId], queryFn: () => openConversation(connectionId), retry: false });
  const cid = convo.data?.conversation_id;
  const messages = useQuery({
    queryKey: ["chat-messages", cid], enabled: !!cid, refetchInterval: 4000,
    queryFn: async () => {
      await supabase.rpc("mark_conversation_read", { _conversation_id: cid! });
      const { data, error } = await supabase.from("messages").select("*").eq("conversation_id", cid!).order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const [text, setText] = useState("");
  const send = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("messages").insert({ conversation_id: cid!, sender_id: convo.data!.me, message: text.trim() });
      if (error) throw error;
    },
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: ["chat-messages", cid] }); },
  });
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages.data?.length]);

  if (convo.isLoading) return <ScreenState kind="loading" title="Opening chat" />;
  if (convo.isError || !convo.data) return <ScreenState kind="error" title="Chat is not available" description="Chat opens only for the business and creator of a confirmed connection." />;
  const c = convo.data;
  const otherName = c.is_business ? c.creator_name : c.business_name;

  return <div className="mx-auto flex h-[calc(100dvh-10rem)] max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-card">
    <header className="flex items-center gap-3 border-b border-border p-4">
      <Button variant="ghost" size="icon" aria-label="Back" onClick={() => router.history.back()}><ArrowLeft /></Button>
      {c.is_business ? <CreatorAvatar path={c.creator_avatar} name={otherName} className="size-10" /> : <CreatorAvatar path={null} name={otherName} className="size-10" />}
      <div className="min-w-0"><h1 className="truncate font-semibold">{otherName}</h1><p className="text-xs text-muted-foreground">{c.campaign} · {c.is_business ? "Creator" : "Business"} · Confirmed</p></div>
    </header>
    <div className="flex-1 space-y-3 overflow-y-auto p-4">
      {messages.isLoading ? <p className="text-sm text-muted-foreground">Loading messages…</p> : !messages.data?.length ? <p className="py-12 text-center text-sm text-muted-foreground">No messages yet</p> :
        messages.data.map((m) => { const mine = m.sender_id === c.me; return <div key={m.id} className={mine ? "flex justify-end" : "flex items-end justify-start gap-2"}>{!mine && <CreatorAvatar path={c.is_business ? c.creator_avatar : null} name={otherName} className="size-7" />}
          <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-accent text-foreground"} ${!mine && !m.read_at ? "ring-2 ring-primary/30" : ""}`}>
            <p className="whitespace-pre-wrap break-words">{m.message}</p>
            <p className={`mt-1 flex items-center gap-1 text-[11px] ${mine ? "justify-end text-primary-foreground/70" : "text-muted-foreground"}`}>
              {new Date(m.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
              {mine && (m.read_at ? <><CheckCheck className="size-3" /> Read</> : <><Check className="size-3" /> Sent</>)}
            </p>
          </div></div>; })}
      <div ref={endRef} />
    </div>
    <form className="flex gap-2 border-t border-border p-3" onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate(); }}>
      <Input value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} placeholder="Message…" aria-label="Message" className="rounded-full" />
      <Button type="submit" className="rounded-full" disabled={!text.trim() || send.isPending}><Send />Send</Button>
    </form>
    {send.isError && <p className="px-3 pb-3 text-sm text-destructive">The message could not be sent.</p>}
  </div>;
}
