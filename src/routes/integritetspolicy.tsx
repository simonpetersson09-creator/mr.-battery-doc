import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/integritetspolicy")({
  head: () => ({
    meta: [
      { title: "Integritetspolicy — Mr. Battery Doc" },
      { name: "description", content: "Integritetspolicy för Mr. Battery Doc." },
      { property: "og:title", content: "Integritetspolicy — Mr. Battery Doc" },
      { property: "og:description", content: "Integritetspolicy för Mr. Battery Doc." },
    ],
  }),
  component: () => (
    <LegalPage
      titleKey="legal.privacy.title"
      bodyKeys={["legal.privacy.p1", "legal.privacy.p2", "legal.privacy.p3"]}
    />
  ),
});
