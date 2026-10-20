import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Pencil, Search, Sparkles, Upload } from "lucide-react";
import { checkInstagramProfile, confirmInstagramAccount, extractProfileEvidence, summarizeSocialAccount } from "@/lib/social-summary.functions";
import { uploadAvatar } from "@/lib/marketplace-api";
import { supabase } from "@/integrations/supabase/client";
import { NOT_AVAILABLE as NA, displayRows, emptyMetrics, fromEvidence, fromInstagramApi, fromProfileInfo, type SocialAccountData, type SocialPlatform } from "@/lib/social-sources";
import { CreatorAvatar } from "@/components/marketplace/marketplace-extras";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LOOKUP_COOLDOWN_MS } from "@/lib/instagram-lookup-policy";

const PLATFORMS: SocialPlatform[] = ["Instagram", "TikTok", "YouTube", "Facebook"];
type Reel = { views: string; likes: string; comments: string; url: string };
type Props = {
  avatar: string | null; displayName: string; followers: string; niche: string; reels: Reel[];
  username: string; profileLink: string;
  onConfirm: (v: { username: string; profileLink: string }) => void;
  onScreenshot: (path: string) => void;
};
type Phase = "empty" | "checking" | "found" | "partial" | "unable" | "error";
const USERNAME = /^@?[A-Za-z0-9._-]{1,60}$/;
let instagramPending = false;
let instagramRetryAt = 0;

export function SocialProfileCheck(p: Props) {
  const [platform, setPlatform] = useState<SocialPlatform>("Instagram");
  const [username, setUsername] = useState(p.username);
  const [url, setUrl] = useState(p.profileLink);
  const [phase, setPhase] = useState<Phase>("empty");
  const [account, setAccount] = useState<SocialAccountData | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [shot, setShot] = useState("");
  const [saveError, setSaveError] = useState("");
  const summarize = useServerFn(summarizeSocialAccount);
  const extract = useServerFn(extractProfileEvidence);
  const fetchIg = useServerFn(checkInstagramProfile);
  const confirmIg = useServerFn(confirmInstagramAccount);
  const qc = useQueryClient();
  const saved = useQuery({ queryKey: ["creator-social-account", platform], queryFn: async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data, error } = await supabase.from("creator_social_accounts").select("*").eq("creator_id", auth.user.id).eq("platform", platform).maybeSingle();
    if (error) throw error;
    return data;
  } });
  useEffect(() => {
    const row = saved.data;
    if (!row) return;
    const metrics = row.metrics as SocialAccountData["metrics"];
    const restored: SocialAccountData = { platform, username: row.username, profile_url: row.profile_url,
      metrics: { ...emptyMetrics(), ...metrics }, source_type: row.source_type as SocialAccountData["source_type"],
      check_status: row.check_status as SocialAccountData["check_status"], evidence_path: row.evidence_path };
    setUsername(row.username); setUrl(row.profile_url ?? "");
    setAccount(restored); setConfirmed(true); setPhase("partial");
  }, [saved.data, platform]);
  const [saving, setSaving] = useState(false);
  const reqId = useRef(0);
  const igCheck = useRef<Extract<Awaited<ReturnType<typeof checkInstagramProfile>>, { ok: true }> | null>(null);
  const [checkError, setCheckError] = useState("");
  const [lookupPending, setLookupPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    const update = () => { setCooldown(Math.max(0, Math.ceil((instagramRetryAt - Date.now()) / 1000))); setLookupPending(instagramPending); };
    update(); const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);
  const ai = useMutation({ mutationFn: (a: SocialAccountData) => summarize({ data: { account: Object.fromEntries(displayRows(a)), source: a.source_type } }) });

  const show = (a: SocialAccountData) => {
    setAccount(a); setConfirmed(false); setSaveError(""); ai.reset();
    setPhase(displayRows(a).some(([, v]) => v === NA) ? "partial" : "found");
  };

  const clearResult = () => { reqId.current++; igCheck.current = null; setAccount(null); setConfirmed(false); setCheckError(""); ai.reset(); setPhase("empty"); };

  const inFlight = useRef(false);
  const check = async () => {
    if (inFlight.current || (platform === "Instagram" && (instagramPending || instagramRetryAt > Date.now()))) return;
    inFlight.current = true;
    const isInstagram = platform === "Instagram";
    if (isInstagram) instagramPending = true;
    setLookupPending(true);
    const req = ++reqId.current;
    setPhase("checking"); setAccount(null); igCheck.current = null; setConfirmed(false); setCheckError(""); ai.reset();
    try {
      if (platform === "Instagram") {
        const result = await fetchIg({ data: { usernameOrUrl: username.trim() || url.trim() } });
        if (!result.ok) {
          instagramRetryAt = Math.max(instagramRetryAt, result.retryAt);
          if (req === reqId.current) { setCheckError(result.message); setPhase("error"); }
          return;
        }
        if (req !== reqId.current) return;
        igCheck.current = result;
        show(fromInstagramApi(result.profile));
        return;
      }
      if (!USERNAME.test(username.trim()) || (url && !/^https?:\/\//.test(url))) { setPhase("unable"); return; }
      show(fromProfileInfo({ platform, username, profile_url: url, display_name: p.displayName, followers: p.followers, niche: p.niche, reels: p.reels }));
    } catch (err) {
      if (req !== reqId.current) return;
      setCheckError(err instanceof Error ? err.message : "Something went wrong."); setPhase("error");
    } finally {
      inFlight.current = false;
      if (isInstagram) { instagramPending = false; instagramRetryAt = Math.max(instagramRetryAt, Date.now() + LOOKUP_COOLDOWN_MS); }
      setLookupPending(false);
      setCooldown(Math.max(0, Math.ceil((instagramRetryAt - Date.now()) / 1000)));
    }
  };

  const confirm = async () => {
    if (!account) return;
    setSaveError("");
    if (account.platform === "Instagram" && account.source_type === "profile_check" && igCheck.current) {
      setSaving(true);
      try {
        const r = await confirmIg({ data: { check: igCheck.current } });
        if (r.username !== account.username) throw new Error("The confirmed account doesn't match the checked account.");
        await qc.invalidateQueries();
        p.onConfirm({ username: r.username, profileLink: r.profileUrl });
        setConfirmed(true);
        document.getElementById("evidence-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (err) { setSaveError(err instanceof Error ? err.message : "The account could not be saved. Please try again."); }
      finally { setSaving(false); }
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setSaveError("You are not signed in."); return; }
    const { error } = await supabase.from("creator_social_accounts").upsert({
      creator_id: auth.user.id, platform: account.platform, username: account.username, profile_url: account.profile_url,
      metrics: account.metrics, source_type: account.source_type, check_status: account.check_status,
      evidence_path: account.evidence_path ?? null, checked_at: new Date().toISOString(),
    }, { onConflict: "creator_id,platform" });
    if (error) { setSaveError("The account could not be saved. Please try again."); return; }
    p.onConfirm({ username: account.username, profileLink: account.profile_url ?? "" });
    setConfirmed(true);
    document.getElementById("evidence-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const s = ai.data;
  const rows = account ? displayRows(account) : [];
  const get = (k: string) => rows.find(([key]) => key === k)?.[1] ?? NA;
  const fromEv = account?.source_type === "uploaded_evidence";
  return <Card className="shadow-none">
    <CardHeader><CardTitle>Social account</CardTitle><p className="text-sm text-muted-foreground">Instagram details come from GramScraper. Manual information is creator-provided. A public profile check does not prove account ownership or CommonGround identity verification.</p></CardHeader>
    <CardContent className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Label className="grid gap-2"><span>Platform</span><Select disabled={lookupPending || saving} value={platform} onValueChange={(v) => { setPlatform(v as SocialPlatform); clearResult(); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PLATFORMS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></Label>
        <Label className="grid gap-2"><span>Username</span><Input disabled={lookupPending || saving} value={username} onChange={(e) => { setUsername(e.target.value); setUrl(""); clearResult(); }} placeholder="@username" /></Label>
        <Label className="grid gap-2"><span>Profile URL (optional)</span><Input disabled={lookupPending || saving} type="url" value={url} onChange={(e) => { setUrl(e.target.value); setUsername(""); clearResult(); }} placeholder="https://" /></Label>
      </div>
      <Button type="button" className="rounded-full" disabled={!(username.trim() || (platform === "Instagram" && url.trim())) || lookupPending || phase === "checking" || (platform === "Instagram" && cooldown > 0)} onClick={check}><Search className="size-4" />{lookupPending || phase === "checking" ? "Checking…" : "Check Profile"}</Button>
      {platform === "Instagram" && cooldown > 0 && !lookupPending && <p role="status" className="text-xs text-muted-foreground">{cooldown > 3600 ? `Lookup available after ${new Date(instagramRetryAt).toLocaleString()}.` : `You can check again in ${cooldown >= 60 ? `${Math.ceil(cooldown / 60)} minutes` : `${cooldown} seconds`}.`}</p>}

      {phase === "empty" && <p className="text-sm text-muted-foreground">Enter a username and press Check Profile.</p>}
      {phase === "unable" && <p className="rounded-lg border border-border p-4 text-sm">Unable to check this profile. Check the username and URL, or upload a profile screenshot below.</p>}
      {phase === "error" && <p role="alert" className="text-sm text-destructive">{checkError || "Something went wrong. Please try again."}</p>}
      <p className="text-xs text-muted-foreground">Manual profile fields above remain available as creator-provided information; save your profile to keep them.</p>

      {account && (phase === "found" || phase === "partial") && <div className="space-y-4 rounded-xl border border-border p-5">
        <div className="flex flex-wrap items-center gap-4">{account.picture_url ? <img src={account.picture_url} alt={account.username} referrerPolicy="no-referrer" className="size-16 rounded-full object-cover" /> : account.metrics.picture_url ? <CreatorAvatar path={account.metrics.picture_url} name={account.username} className="size-16" /> : <span className="text-xs text-muted-foreground">Picture not available</span>}<div><p className="font-semibold">{get("Display name")}</p><p className="text-sm text-muted-foreground">{get("Username")} · {account.platform}</p></div>
          <span className="ml-auto rounded-full bg-muted px-3 py-1 text-xs font-medium">{account.check_status}{phase === "partial" ? " · Partially accessible" : ""}</span></div>
        {fromEv && <p className="text-xs font-semibold uppercase text-primary">Extracted from uploaded evidence</p>}
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rows.filter(([k]) => !["Platform", "Username", "Display name"].includes(k)).map(([k, v]) => <div key={k}><dt className="text-xs font-bold uppercase text-muted-foreground">{k}</dt><dd className={`mt-1 break-words ${v === NA ? "text-muted-foreground" : ""}`}>{v}</dd></div>)}</dl>

        <Button type="button" variant="outline" className="rounded-full" disabled={ai.isPending} onClick={() => ai.mutate(account)}><Sparkles className="size-4 text-primary" />{ai.isPending ? "AI analyzing…" : s ? "Summarize Account again" : "AI Assistance · Summarize Account"}</Button>
        {ai.isError && <p className="text-sm text-destructive">{(ai.error as Error).message}</p>}
        {s && !ai.isPending && <div className="space-y-3 rounded-lg bg-primary/5 p-4">
          <p className="font-medium">{s.quick_summary}</p>
          {([["Account Overview", s.account_overview], ["Audience Size", s.audience_size], ["Visible Engagement", s.visible_engagement], ["Content Activity", s.content_activity], ["Content/Niche", s.content_niche], ["Platform Presence", s.platform_presence]] as const).map(([t, v]) => <div key={t}><h4 className="text-xs font-bold uppercase text-muted-foreground">{t}</h4><p className="text-sm leading-6">{v}</p></div>)}
          <p className="text-xs text-muted-foreground">AI-generated from the details above only{fromEv ? " (extracted from uploaded evidence)" : ""}. Not an official platform verification.</p>
        </div>}

        <div className="flex flex-wrap gap-3">
          <Button type="button" className="rounded-full" disabled={confirmed || saving} onClick={confirm}><Check className="size-4" />{confirmed ? "Account confirmed" : saving ? "Saving…" : "Confirm Account"}</Button>
          <Button type="button" variant="ghost" className="rounded-full" disabled={saving} onClick={clearResult}><Pencil className="size-4" />Edit</Button>
        </div>
        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
        {confirmed && <p className="text-sm text-muted-foreground">Saved. Continue to Evidence below, then save your profile.</p>}
      </div>}

      <div className="rounded-xl border border-dashed border-border p-4">
        <Label htmlFor="profile-evidence" className="flex items-center gap-2 font-medium"><Upload className="size-4" />Upload Profile Evidence</Label>
        <p className="mt-1 text-xs text-muted-foreground">If your profile can't be checked, upload a screenshot. Only the values visibly shown are read, and it is added to your Evidence list.</p>
        <Input id="profile-evidence" type="file" accept="image/*" disabled={lookupPending || saving} className="mt-3" onChange={async (e) => {
          const f = e.target.files?.[0]; if (!f) return;
          clearResult();
          setShot("Uploading…");
          try {
            const path = await uploadAvatar(f);
            p.onScreenshot(path);
            setShot("Reading the screenshot…"); setPhase("checking");
            const extracted = await extract({ data: { path, platform } });
            show(fromEvidence({ platform, username, profile_url: url }, extracted, path));
            setShot("Screenshot added to Evidence.");
          } catch (err) { setPhase("error"); setShot(err instanceof Error ? err.message : "Upload failed."); }
        }} />
        {shot && <p className="mt-2 text-xs text-muted-foreground">{shot}</p>}
      </div>
    </CardContent>
  </Card>;
}
