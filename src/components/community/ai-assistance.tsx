import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { summarizeInitiative } from "@/lib/initiative-summary.functions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScreenState } from "./core";

export function AiAssistance({ initiativeId }: { initiativeId: string }) {
  const [open, setOpen] = useState(false);
  const summarize = useServerFn(summarizeInitiative);
  const run = useMutation({ mutationKey: ["summary", initiativeId], mutationFn: () => summarize({ data: { initiativeId } }) });
  const s = run.data;
  return <>
    <Button variant="outline" className="w-full rounded-full" onClick={() => setOpen(true)}><Sparkles className="size-4 text-primary" />AI Assistance</Button>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader><SheetTitle>AI Assistance</SheetTitle><SheetDescription>Summarizes only the information in this initiative. It does not fact-check, recommend, or change anything.</SheetDescription></SheetHeader>
        <div className="space-y-5 px-4 pb-6">
          <Button className="w-full" onClick={() => run.mutate()} disabled={run.isPending}><Sparkles className="size-4" />{run.isPending ? "Summarizing…" : s ? "Summarize Topic again" : "Summarize Topic"}</Button>
          {run.isPending && <ScreenState kind="loading" title="Generating summary" />}
          {run.isError && !run.isPending && <ScreenState kind="error" title="Summary unavailable" description={(run.error as Error).message} />}
          {s && !run.isPending && <div className="space-y-5">
            <p className="rounded-lg bg-primary/5 p-4 font-medium leading-7">{s.quick_summary}</p>
            <Block title="What is this about?" text={s.what_is_this_about} />
            <Block title="Why does it matter?" text={s.why_it_matters} />
            <div><h3 className="mb-1 text-xs font-bold uppercase text-muted-foreground">Key points</h3>{s.key_points.length ? <ul className="list-disc space-y-1 pl-5 leading-7">{s.key_points.map((p, i) => <li key={i}>{p}</li>)}</ul> : <p className="text-muted-foreground">Not specified in this initiative.</p>}</div>
            <Block title="Who / what is affected" text={s.who_is_affected} />
            <Block title="What creators are asked to support" text={s.what_creators_are_asked} />
            <p className="text-xs text-muted-foreground">AI-generated from this initiative's content only. Check the original details above.</p>
          </div>}
        </div>
      </SheetContent>
    </Sheet>
  </>;
}

function Block({ title, text }: { title: string; text: string }) {
  return <div><h3 className="mb-1 text-xs font-bold uppercase text-muted-foreground">{title}</h3><p className="leading-7">{text}</p></div>;
}
