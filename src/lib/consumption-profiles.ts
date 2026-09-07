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

export const PROFILE_CATALOG: ConsumptionProfileMeta[] = CUSTOMER_LOAD_PROFILES.map((p) => ({
  id: p.id,
  name: p.label,
  description: p.description,
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
