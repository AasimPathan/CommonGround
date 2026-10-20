import { createFileRoute, Navigate, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMyIdentity } from "@/lib/community-api";
import { AppShell } from "@/components/community/app-shell";
import { ScreenState } from "@/components/community/core";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => { const { data, error } = await supabase.auth.getUser(); if (error || !data.user) throw redirect({ to: "/auth" }); return { user: data.user }; },
  component: AuthenticatedLayout,
});
function AuthenticatedLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const identity = useQuery({ queryKey: ["identity"], queryFn: getMyIdentity });
  if (identity.isLoading) return <main className="grid min-h-screen place-items-center p-6"><ScreenState kind="loading" title="Preparing your workspace" /></main>;
  if (identity.isError || !identity.data?.roles[0]) return <main className="grid min-h-screen place-items-center p-6"><ScreenState kind="error" title="We couldn't open your workspace" description="Please sign out and try again." /></main>;
  const role = identity.data.roles[0];
  const isAdmin = role === "initiative_manager" || role === "reviewer";
  if (path.startsWith("/admin") && !isAdmin) return <Navigate to={role === "business" ? "/business" : "/dashboard"} replace />;
  if (isAdmin && path === "/dashboard") return <Navigate to="/admin" replace />;
  if (role === "business" && path === "/dashboard") return <Navigate to="/business" replace />;
  if (role === "creator" && (path.startsWith("/business") || path === "/admin")) return <Navigate to="/dashboard" replace />;
  return <AppShell role={identity.data.roles[0]} name={identity.data.profile?.display_name ?? identity.data.user.email ?? ""}><Outlet /></AppShell>;
}
