import { createFileRoute } from "@tanstack/react-router";
import { BusinessPage } from "@/components/community/simple-pages";

export const Route = createFileRoute("/_authenticated/business/")({
  head: () => ({
    meta: [
      { title: "Business marketplace — CommonGround" },
      { name: "description", content: "Manage campaigns, creator discovery, and connections." },
      { property: "og:title", content: "Business marketplace — CommonGround" },
      { property: "og:description", content: "Manage campaigns, creator discovery, and connections." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BusinessPage,
});
