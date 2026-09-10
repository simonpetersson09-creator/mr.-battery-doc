import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/anvandarvillkor")({
  head: () => ({
    meta: [
      { title: "Användarvillkor — Mr. Battery Doc" },
      { name: "description", content: "Användarvillkor för Mr. Battery Doc." },
      { property: "og:title", content: "Användarvillkor — Mr. Battery Doc" },
      { property: "og:description", content: "Användarvillkor för Mr. Battery Doc." },
    ],
  }),
  component: () => (
    <LegalPage
      titleKey="legal.terms.title"
      bodyKeys={["legal.terms.p1", "legal.terms.p2", "legal.terms.p3"]}
    />
  ),
});
