import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export async function fetchNotifications() {
  const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return data;
}

export async function markNotificationRead(id: string) {
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
}

export function NotificationBell() {
  const router = useRouter();
  const query = useQuery({ queryKey: ["notifications"], queryFn: fetchNotifications, refetchInterval: 8000 });
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!query.data) return;
    if (seen.current === null) { seen.current = new Set(query.data.map((n) => n.id)); return; }
    for (const n of query.data) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      if (n.read_at) continue;
      toast(n.title, {
        description: n.message,
        action: n.link ? { label: "Open", onClick: () => { void markNotificationRead(n.id); router.history.push(n.link as string); } } : undefined,
      });
    }
  }, [query.data, router]);
  const unread = query.data?.filter((n) => !n.read_at).length ?? 0;
  return <Link to="/notifications" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} className="relative grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
    <Bell className="size-4" />
    {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">{unread > 9 ? "9+" : unread}</span>}
  </Link>;
}
