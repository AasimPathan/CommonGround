import { createFileRoute } from "@tanstack/react-router";
import { MarketplacePage } from "@/components/community/simple-pages";

export const Route = createFileRoute("/_authenticated/marketplace/")({
  head: () => ({
    meta: [
      { title: "Marketplace — CommonGround" },
      { name: "description", content: "View your CommonGround creator connection requests." },
      { property: "og:title", content: "Marketplace — CommonGround" },
      { property: "og:description", content: "View your CommonGround creator connection requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MarketplacePage,
});
