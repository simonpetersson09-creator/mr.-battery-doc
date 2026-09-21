/**
 * Consumption profile registry — thin presentation wrapper.
 *
 * The 12 customer profiles come DIRECTLY from Battery Engine v1
 * (`CUSTOMER_LOAD_PROFILES`). This app defines no profile weights of its own and
 * never renders internal model parameters — only id, name and description.
 */

import { CUSTOMER_LOAD_PROFILES } from "@/lib/battery-engine";

/** Profile id === the engine's LoadProfileShape id. */
export type ProfileId = string;

export interface ConsumptionProfileMeta {
  id: ProfileId;
  name: string;
  description: string;
  source: "energy-architect";
  /** true — the verified Energy Architect catalogue is imported. */
  dataImported: boolean;
}

/**
 * Short, scannable descriptions shown in the picker. The engine's own
 * longer `description` stays the source of truth for documentation/audit;
 * this is presentation only.
 */
const SHORT_DESCRIPTIONS: Record<string, string> = {
  normal: "Morgontopp och kvällstopp, lugnare helger.",
  "evening-heavy": "Tomt på dagen — tyngst på kvällen.",
  "day-heavy": "Någon hemma hela dagen, jämn förbrukning.",
  "heat-pump": "Värmepump med kraftig morgonuppvärmning.",
  "direct-electric": "Elradiatorer med hårda toppar morgon och kväll.",
  "heat-pump-ev": "Värmepump och elbil — tyngsta villatypen.",
  "ev-night": "Hushåll + elbil som laddas på natten.",
  "ev-evening": "Hushåll + elbil laddas på kvällen.",
  "pool-summer": "Pool och uteliv — sommaren tyngst.",
  office: "Kontorstider 07–18 vardagar, tomt på helgen.",
  "retail-restaurant": "Öppet 09–20, kyl och frys dygnet runt.",
  workshop: "Produktion 07–16 vardagar med maskintoppar.",
};

export const PROFILE_CATALOG: ConsumptionProfileMeta[] = CUSTOMER_LOAD_PROFILES.map((p) => ({
  id: p.id,
  name: p.label,
  description: SHORT_DESCRIPTIONS[p.id] ?? p.description,
  source: "energy-architect" as const,
  dataImported: true,
}));

export function getProfile(id?: ProfileId | null) {
  return PROFILE_CATALOG.find((p) => p.id === id);
}

export function isKnownProfile(id?: ProfileId | null): boolean {
  return !!id && PROFILE_CATALOG.some((p) => p.id === id);
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
