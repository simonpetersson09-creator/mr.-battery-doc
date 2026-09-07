export const WIZARD_STEPS = [
  { path: "/nat", label: "Nät" },
  { path: "/forbrukning", label: "Förbrukning" },
  { path: "/produktion", label: "Produktion" },
  { path: "/batteri", label: "Batteri" },
  { path: "/ekonomi", label: "Ekonomi" },
  { path: "/resultat", label: "Resultat" },
] as const;

export type WizardPath = (typeof WIZARD_STEPS)[number]["path"];
