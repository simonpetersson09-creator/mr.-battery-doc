/**
 * Consumption profile registry.
 *
 * The 12 verified profiles from Energy Architect are NOT imported yet.
 * This file only defines the shape and the user-facing metadata slots the UI
 * renders. When the real profiles arrive, replace `PROFILE_CATALOG` with the
 * imported catalogue — the UI and the wizard state need no changes, because
 * only `id`, `name` and `description` are ever rendered.
 *
 * Internal model parameters (shape factors, hourly curves, temperature
 * dependencies, ...) must stay inside the Energy Architect payload and must
 * never be shown in the UI.
 */

export type ProfileId = string;

export interface ConsumptionProfileMeta {
  id: ProfileId;
  name: string;
  description: string;
  /** Where the profile definition comes from. */
  source: "energy-architect";
  /** false until the verified Energy Architect data is imported. */
  dataImported: boolean;
}

/**
 * Placeholder metadata only — 12 slots matching Energy Architect's catalogue.
 * No synthetic/simplified profile maths exists anywhere in this app.
 */
export const PROFILE_CATALOG: ConsumptionProfileMeta[] = [
  {
    id: "villa-electric-heating",
    name: "Villa med elvärme",
    description: "Hus som värms med direktverkande el eller elpanna.",
  },
  {
    id: "villa-heat-pump",
    name: "Villa med värmepump",
    description: "Hus som värms med luft/vatten- eller bergvärmepump.",
  },
  {
    id: "villa-district-heating",
    name: "Villa med fjärrvärme",
    description: "Hus där värmen inte kommer från el.",
  },
  {
    id: "villa-wood-supplement",
    name: "Villa med vedeldning",
    description: "Hus där en del av värmen kommer från ved eller pellets.",
  },
  {
    id: "apartment",
    name: "Lägenhet",
    description: "Boende med låg och jämn elförbrukning.",
  },
  {
    id: "holiday-home",
    name: "Fritidshus",
    description: "Används delar av året, ofta helger och semester.",
  },
  {
    id: "villa-ev",
    name: "Villa med elbil",
    description: "Hushåll som laddar elbil hemma.",
  },
  {
    id: "villa-pool",
    name: "Villa med pool",
    description: "Hushåll med pool eller spabad.",
  },
  {
    id: "farm",
    name: "Lantbruk",
    description: "Gård med drift som pågår året runt.",
  },
  {
    id: "small-business",
    name: "Mindre företag",
    description: "Verksamhet med förbrukning främst på vardagar.",
  },
  {
    id: "office",
    name: "Kontor",
    description: "Kontorstider på vardagar, låg förbrukning på helger.",
  },
  {
    id: "industry",
    name: "Industri",
    description: "Verksamhet med hög och jämn förbrukning under drifttid.",
  },
].map((p) => ({ ...p, source: "energy-architect" as const, dataImported: false }));

export function getProfile(id?: ProfileId | null) {
  return PROFILE_CATALOG.find((p) => p.id === id);
}

export const MONTH_NAMES_SV = [
  "Januari",
  "Februari",
  "Mars",
  "April",
  "Maj",
  "Juni",
  "Juli",
  "Augusti",
  "September",
  "Oktober",
  "November",
  "December",
];

export const MONTH_SHORT_SV = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Maj",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dec",
];
