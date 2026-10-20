import { createFileRoute } from "@tanstack/react-router";
import { ChatPage } from "@/components/marketplace/chat-page";

export const Route = createFileRoute("/_authenticated/chat/$connectionId")({
  head: () => ({ meta: [{ title: "Chat — CommonGround" }, { name: "description", content: "Chat with your confirmed CommonGround marketplace connection." }, { property: "og:title", content: "Chat — CommonGround" }, { property: "og:description", content: "Chat with your confirmed CommonGround marketplace connection." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ChatRoute,
});

function ChatRoute() { const { connectionId } = Route.useParams(); return <ChatPage connectionId={connectionId} />; }
