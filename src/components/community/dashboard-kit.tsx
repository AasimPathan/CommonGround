import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function DashboardHero({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-primary px-6 py-10 text-primary-foreground sm:px-10 sm:py-12">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-accent blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 right-24 size-56 rounded-full bg-primary-foreground/10 blur-2xl" />
      <div className="relative max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 text-base leading-7 text-primary-foreground/80">{description}</p>
        {actions && <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">{actions}</div>}
      </div>
    </section>
  );
}

export function StatCard({ icon, label, value, to, hint }: { icon: ReactNode; label: string; value: ReactNode; to?: string; hint?: string }) {
  const body = (
    <Card className={cn("h-full shadow-none transition-all duration-200", to && "group-hover:-translate-y-0.5 group-hover:border-primary/40")}>
      <CardContent className="flex h-full flex-col p-5">
        <span className="grid size-10 place-items-center rounded-lg bg-accent text-primary [&_svg]:size-5">{icon}</span>
        <p className="mt-6 text-3xl font-semibold tabular-nums">{value}</p>
        <p className="mt-1 text-sm font-medium">{label}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        {to && <ArrowRight className="mt-auto size-4 pt-0 text-muted-foreground transition-transform group-hover:translate-x-1" />}
      </CardContent>
    </Card>
  );
  return to ? <Link to={to} className="group block">{body}</Link> : body;
}

export function ActivityList({ title, empty, items }: { title: string; empty: string; items: Array<{ key: string; primary: ReactNode; secondary?: ReactNode; meta?: ReactNode; to?: string | undefined; params?: Record<string, string> }> }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {!items.length ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {items.map((item) => {
            const inner = <><div className="min-w-0"><p className="truncate font-medium">{item.primary}</p>{item.secondary && <p className="mt-0.5 truncate text-sm text-muted-foreground">{item.secondary}</p>}</div><div className="flex shrink-0 items-center gap-3">{item.meta}{item.to && <ArrowRight className="size-4 text-muted-foreground" />}</div></>;
            return item.to ? (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <Link key={item.key} to={item.to as any} params={item.params as any} className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/50">{inner}</Link>
            ) : <div key={item.key} className="flex items-center justify-between gap-4 p-4">{inner}</div>;
          })}
        </div>
      )}
    </section>
  );
}
