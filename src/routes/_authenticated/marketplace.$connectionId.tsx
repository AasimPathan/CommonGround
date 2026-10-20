import { createFileRoute } from "@tanstack/react-router";
import { CreatorConnectionPage } from "@/components/marketplace/marketplace-pages";

export const Route = createFileRoute("/_authenticated/marketplace/$connectionId")({
  head: () => ({ meta: [{ title: "Connection request — CommonGround" }, { name: "description", content: "Review a CommonGround marketplace connection request." }, { property: "og:title", content: "Connection request — CommonGround" }, { property: "og:description", content: "Review a CommonGround marketplace connection request." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ConnectionRoute,
});

function ConnectionRoute() { const { connectionId } = Route.useParams(); return <CreatorConnectionPage id={connectionId} />; }