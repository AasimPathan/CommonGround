import { Link } from "@tanstack/react-router";
import { ArrowUpRight, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./core";
import type { Initiative } from "@/lib/community";

export function InitiativeCard({ initiative }: { initiative: Initiative }) {
  return <Link to="/community/$initiativeId" params={{ initiativeId: initiative.id }} className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <Card className="h-full overflow-hidden border-border bg-card shadow-none transition duration-200 group-hover:-translate-y-1 group-hover:shadow-lg">
      <div className="h-2 bg-primary" />
      <CardContent className="flex h-full min-h-72 flex-col p-6">
        <div className="mb-7 flex items-start justify-between gap-4"><p className="text-xs font-bold uppercase text-muted-foreground">{initiative.category}</p><StatusBadge status={initiative.status} /></div>
        <h3 className="text-xl font-semibold leading-tight text-card-foreground">{initiative.title}</h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{initiative.description}</p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-8 text-sm"><span className="flex min-w-0 items-center gap-2 text-muted-foreground"><MapPin className="size-4 shrink-0"/><span className="truncate">{initiative.location}</span></span><ArrowUpRight className="size-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/></div>
      </CardContent>
    </Card>
  </Link>;
}
