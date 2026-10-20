import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  beforeLoad: () => { throw redirect({ to: "/auth" }); },
  head: () => ({ meta: [{ title: "Sign in — CommonGround" }, { name: "description", content: "Sign in to CommonGround." }, { property: "og:title", content: "Sign in — CommonGround" }, { property: "og:description", content: "Sign in to CommonGround." }] }),
  component: () => null,
});
