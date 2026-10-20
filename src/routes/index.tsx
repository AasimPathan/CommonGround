import communityImage from "@/assets/landing-community.jpg";
import { BrandLogo } from "@/components/community/brand-logo";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, BookOpenCheck, FileSearch, HandHeart, Link2, LockKeyhole, Search, UserRound, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CommonGround — Local voices, shared action" },
      { name: "description", content: "Discover and support reviewed local community initiatives with clear, documented information." },
      { property: "og:title", content: "CommonGround — Local voices, shared action" },
      { property: "og:description", content: "Discover and support reviewed local community initiatives with clear, documented information." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

const community = [
  { icon: Search, title: "Discover reviewed initiatives", text: "Every initiative is checked by a reviewer before it reaches the community." },
  { icon: FileSearch, title: "Understand the sources", text: "Documented information, evidence, and claims are presented separately and clearly." },
  { icon: HandHeart, title: "Support voluntarily", text: "Participation is always your choice, with no pressure or targets." },
  { icon: Link2, title: "Share your content link", text: "Submit a link to the content you created for an initiative you support." },
  { icon: LockKeyhole, title: "Private history", text: "Your participation history is visible only to you." },
];
const market = [
  { icon: UserRound, title: "Creator profiles", text: "Creators can showcase their profiles and evidence of their work." },
  { icon: BookOpenCheck, title: "Structured discovery", text: "Businesses can discover creators using structured filters." },
  { icon: ListChecks, title: "Shortlist and connect", text: "Businesses can shortlist and connect with creators." },
];

function Logo() { return <Link to="/" className="text-lg font-bold text-foreground"><BrandLogo /></Link>; }

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.session.user.id);
      const r = roles?.map((x) => x.role) ?? [];
      navigate({ to: r.includes("initiative_manager") || r.includes("reviewer") ? "/admin" : r.includes("business") ? "/business" : "/dashboard" });
    });
  }, [navigate]);

  return <div className="min-h-screen bg-background">
    <header className="border-b border-border"><nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5"><Logo /><div className="flex items-center gap-2"><Button asChild variant="ghost"><Link to="/auth">Sign In</Link></Button><Button asChild size="sm" className="hidden sm:inline-flex"><Link to="/signup/creator">Join as Creator</Link></Button><Button asChild size="sm" className="hidden sm:inline-flex"><Link to="/signup/business">Join as Business</Link></Button></div></nav></header>
    <main>
      <section className="mx-auto max-w-6xl px-5 py-20 sm:py-32">
        <p className="mb-5 text-sm font-bold uppercase text-primary">Local voices. Shared action.</p>
        <h1 className="max-w-4xl text-5xl font-semibold leading-none text-foreground sm:text-7xl">Community starts with clear information.</h1>
        <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground">A thoughtful space for creators to discover and support reviewed local initiatives.</p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap"><Button asChild size="lg"><Link to="/signup/creator">Join as Creator<ArrowRight /></Link></Button><Button asChild size="lg"><Link to="/signup/business">Join as Business<ArrowRight /></Link></Button><Button asChild size="lg" variant="outline"><Link to="/community">Explore Community</Link></Button></div>
        <img src={communityImage} alt="Neighbors and local creators planting a community garden together" width={1600} height={912} className="mt-14 aspect-[16/9] w-full rounded-lg border border-border object-cover sm:aspect-[21/9]" />
      </section>
      <Section eyebrow="Community" title="Clear information, voluntary participation." items={community} muted />
      <Section eyebrow="Creator Marketplace" title="Where creators and businesses meet." items={market} />
      <section className="bg-foreground"><div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-5 py-20 sm:flex-row sm:items-end"><h2 className="max-w-xl text-4xl font-semibold text-primary-foreground sm:text-5xl">Explore CommonGround</h2><Button asChild size="lg"><Link to="/signup/creator">Create an account<ArrowRight /></Link></Button></div></section>
    </main>
    <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground"><Logo /><div className="flex gap-5"><Link to="/signup/business" className="hover:text-foreground">Business signup</Link><Link to="/admin/login" className="hover:text-foreground">Admin sign in</Link></div></footer>
  </div>;
}

function Section({ eyebrow, title, items, muted }: { eyebrow: string; title: string; items: typeof community; muted?: boolean }) {
  return <section className={muted ? "border-y border-border bg-secondary/60" : ""}><div className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
    <p className="mb-3 text-xs font-bold uppercase text-primary">{eyebrow}</p>
    <h2 className="max-w-2xl text-3xl font-semibold text-foreground sm:text-5xl">{title}</h2>
    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(({ icon: Icon, title, text }) => <div key={title} className="rounded-lg border border-border bg-card p-6 transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transform-none"><div className="mb-5 grid size-10 place-items-center rounded-md bg-primary/10 text-primary"><Icon className="size-5" /></div><h3 className="font-semibold text-foreground">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>)}</div>
  </div></section>;
}
