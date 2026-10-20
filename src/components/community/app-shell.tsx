import { BrandLogo } from "@/components/community/brand-logo";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Bell, BriefcaseBusiness, CircleUserRound, ClipboardCheck, Compass, FolderKanban, History, Home, LayoutDashboard, ListChecks, LogOut, Menu, PlayCircle, PlusCircle, Search, UsersRound, X } from "lucide-react";
import { useEffect, useState } from "react";

const TRAIL_KEY = "cg-page-trail";
function readTrail(): string[] { try { return JSON.parse(sessionStorage.getItem(TRAIL_KEY) || "[]"); } catch { return []; } }
function writeTrail(t: string[]) { sessionStorage.setItem(TRAIL_KEY, JSON.stringify(t.slice(-50))); }
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/community/notification-bell";
import type { AppRole } from "@/lib/community";

const navByRole = {
  creator: [["Dashboard", "/dashboard", Home], ["Community", "/community", Compass], ["Marketplace", "/marketplace", BriefcaseBusiness], ["Awareness Video", "/awareness-videos", PlayCircle], ["Profile", "/profile", CircleUserRound]],
  business: [["Dashboard", "/business", Home], ["Community", "/community", Compass], ["Campaigns", "/business/campaigns", FolderKanban], ["Discover Creators", "/business/discover", Search], ["Connections", "/business/connections", UsersRound]],
  initiative_manager: [["Dashboard", "/admin", LayoutDashboard], ["Initiatives", "/admin/initiatives", ListChecks], ["Create Initiative", "/admin/initiatives/new", PlusCircle], ["Active", "/admin/active", Compass], ["Closed", "/admin/closed", History]],
  reviewer: [["Dashboard", "/admin", LayoutDashboard], ["Review Queue", "/admin/review", ClipboardCheck], ["Active", "/admin/active", Compass], ["Closed", "/admin/closed", History]],
} as const;

export function AppShell({ role, name, children }: { role: AppRole; name: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false); const path = useRouterState({ select: (state) => state.location.pathname }); const navigate = useNavigate(); const queryClient = useQueryClient();
  const href = useRouterState({ select: (state) => state.location.href });
  useEffect(() => { const t = readTrail(); if (t[t.length - 1] !== href) { if (t[t.length - 2] === href) t.pop(); else t.push(href); writeTrail(t); } }, [href]);
  const home = navByRole[role][0][1];
  function goBack() { const t = readTrail(); t.pop(); const prev = t[t.length - 1]; writeTrail(t); if (prev && prev !== href) navigate({ to: prev as string }); else navigate({ to: home }); }
  const nav = navByRole[role];
  async function signOut() { await queryClient.cancelQueries(); queryClient.clear(); await supabase.auth.signOut(); await navigate({ to: "/auth", replace: true }); }
  const menu = <><div className="flex h-20 items-center border-b border-sidebar-border px-6"><Link to="/" className="text-lg font-bold text-sidebar-foreground"><BrandLogo /></Link></div><nav className="flex-1 space-y-1 p-4">{nav.map(([label, to, Icon]) => <Link key={to} to={to} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors", nav.reduce((best, [, t]) => (path === t || path === t + "/" || path.startsWith(t + "/")) && t.length > best.length ? t : best, "") === to ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground")}><Icon className="size-4"/>{label}</Link>)}</nav><div className="border-t border-sidebar-border p-4"><p className="truncate px-3 text-sm font-semibold text-sidebar-foreground">{name || "Community member"}</p><p className="px-3 pb-3 text-xs text-muted-foreground">{role.replaceAll("_", " ")}</p><Button variant="ghost" className="w-full justify-start" onClick={signOut}><LogOut/>Sign out</Button></div></>;
  return <div className="min-h-screen bg-background"><aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">{menu}</aside>{open && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close navigation" className="absolute inset-0 bg-overlay" onClick={() => setOpen(false)}/><aside className="relative flex h-full w-72 flex-col bg-sidebar shadow-2xl">{menu}<Button aria-label="Close navigation" size="icon" variant="ghost" className="absolute right-3 top-5" onClick={() => setOpen(false)}><X/></Button></aside></div>}<header className="sticky top-0 z-30 grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur lg:ml-64 lg:px-8"><Button aria-label="Open navigation" size="icon" variant="ghost" className="lg:hidden" onClick={() => setOpen(true)}><Menu/></Button><div className="min-w-0"><button type="button" onClick={goBack} className="group inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card pl-1.5 pr-4 text-sm font-medium text-foreground shadow-sm transition-all hover:border-primary/40 hover:bg-secondary hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"><span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:-translate-x-0.5"><ArrowLeft className="size-3.5"/></span>Back</button></div><div className="justify-self-end"><NotificationBell/></div></header><main className="lg:ml-64"><div className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-12">{children}</div></main></div>;
}
