import { createFileRoute } from "@tanstack/react-router";
import { MyAwarenessVideosPage } from "@/components/community/awareness-videos";
export const Route = createFileRoute("/_authenticated/awareness-videos")({
  head: () => ({ meta: [{ title: "Awareness Video — CommonGround" }, { name: "description", content: "Your approved awareness videos." }, { property: "og:title", content: "Awareness Video — CommonGround" }, { property: "og:description", content: "Your approved awareness videos." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: MyAwarenessVideosPage,
});
