import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Inbox, LoaderCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { labelStatus, type InitiativeStatus } from "@/lib/community";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-6 border-b border-border pb-8">
    <div className="min-w-0">{eyebrow && <p className="mb-3 text-xs font-bold uppercase text-primary">{eyebrow}</p>}<h1 className="text-3xl font-semibold text-foreground sm:text-5xl">{title}</h1>{description && <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{description}</p>}</div>
    {action && <div className="shrink-0">{action}</div>}
  </header>;
}

export function SectionHeader({ title, description }: { title: string; description?: string }) {
  return <div className="mb-5"><h2 className="text-xl font-semibold text-foreground sm:text-2xl">{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>;
}

export function StatusBadge({ status }: { status: InitiativeStatus | "supported" | "completed" | "pending" | "accepted" | "declined" | "confirmed" | "submitted" }) {
  const tone = status === "active" || status === "completed" || status === "accepted" || status === "confirmed" ? "border-success/20 bg-success/10 text-success" : status === "changes_required" || status === "pending" ? "border-warning/20 bg-warning/10 text-warning" : status === "closed" || status === "declined" ? "border-border bg-muted text-muted-foreground" : "border-primary/20 bg-primary/10 text-primary";
  return <Badge variant="outline" className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", tone)}>{status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}</Badge>;
}

export function ScreenState({ kind, title, description }: { kind: "loading" | "empty" | "error" | "success"; title: string; description?: string }) {
  const Icon = kind === "loading" ? LoaderCircle : kind === "error" ? AlertCircle : kind === "success" ? CheckCircle2 : Inbox;
  return <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-secondary/60 px-6 text-center"><Icon className={cn("mb-4 size-6 text-muted-foreground", kind === "loading" && "animate-spin")} /><h3 className="font-semibold text-foreground">{title}</h3>{description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}</div>;
}
