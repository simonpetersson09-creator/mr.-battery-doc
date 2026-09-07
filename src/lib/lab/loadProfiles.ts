/**
 * Central catalogue of MODELLED Swedish load profiles.
 *
 * Each profile carries independent, editable parts:
 *  - monthShare  : relative share of the annual energy per month (Jan..Dec)
 *  - shape       : diurnal weights for WEEKDAY and WEEKEND (24 values each)
 *  - winter/summer overrides: optional season-dependent diurnal shapes
 *
 * All of it is only *shape*. The annual energy always comes from the user input
 * and every month is normalised exactly, so every profile consumes the same
 * kWh/year and the same kWh/month. Weekday/weekend only changes HOW the month's
 * energy is distributed, never how much it is.
 *
 * The weights of the weekday and weekend shapes are NOT normalised against each
 * other — their relative level is the physical information (a shop is open on
 * Saturday, an office is not).
 *
 * This module has no Battery-Lab dependencies beyond `spreadAnnual` and the
 * shared types, so the catalogue can be exported to other products as-is.
 */

import { spreadAnnual } from "./defaults";
import type { ConsumptionInput, LoadProfileShape } from "./types";

/** Diurnal weights for the two day types. 24 relative values each. */
export interface DiurnalSet {
  weekday: number[];
  weekend: number[];
}

export type ProfileAudience = "customer" | "internal";

export interface LoadProfileDef {
  id: LoadProfileShape;
  label: string;
  description: string;
  /** "customer" = selectable by end users, "internal" = lab/regression only. */
  audience: ProfileAudience;
  /** 12 relative monthly shares, Jan..Dec (normalised internally). */
  monthShare: number[];
  /** Shape used when no season override applies. */
  shape: DiurnalSet;
  /** Optional winter shape (Nov–Mar). */
  winterShape?: DiurnalSet;
  /** Optional summer shape (May–Sep). */
  summerShape?: DiurnalSet;
}

/* ------------------------------------------------------------------ */
/* Calendar helpers                                                    */
/* ------------------------------------------------------------------ */

/**
 * Day type of a day index (0 = Jan 1). The model year deliberately starts on a
 * Monday so the calendar is deterministic and reproducible.
 */
export function isWeekendDay(dayIndex: number): boolean {
  const dow = ((dayIndex % 7) + 7) % 7; // 0 = Monday
  return dow === 5 || dow === 6;
}

export const WEEKEND_DAYS_PER_YEAR = (() => {
  let n = 0;
  for (let d = 0; d < 365; d++) if (isWeekendDay(d)) n++;
  return n;
})();

export type Season = "winter" | "summer" | "shoulder";

/** Season of a month number (1-12). Apr/Oct are transition months. */
export function seasonOfMonth(month: number): Season {
  if (month === 11 || month === 12 || month <= 3) return "winter";
  if (month >= 5 && month <= 9) return "summer";
  return "shoulder";
}

/* ------------------------------------------------------------------ */
/* Month shapes                                                        */
/* ------------------------------------------------------------------ */

/** Fairly flat over the year (district heating / gas, electricity for household only). */
const FLAT_YEAR = [
  0.093, 0.086, 0.088, 0.08, 0.078, 0.073, 0.072, 0.074, 0.079, 0.086, 0.089, 0.102,
];
/** Moderate seasonality — heat pump villa. */
const HEAT_PUMP_YEAR = [
  0.142, 0.13, 0.114, 0.082, 0.055, 0.038, 0.033, 0.036, 0.053, 0.082, 0.11, 0.125,
];
/** Strong seasonality — direct electric heating. */
const DIRECT_YEAR = [
  0.163, 0.149, 0.125, 0.081, 0.045, 0.026, 0.022, 0.026, 0.048, 0.086, 0.11, 0.119,
];
/** Villa with some electric heating (lab default). */
const DEFAULT_YEAR = [
  0.128, 0.115, 0.104, 0.081, 0.061, 0.045, 0.04, 0.043, 0.058, 0.081, 0.106, 0.138,
];
/** Elevated spring/summer use (pool, outdoor living, cooling). */
const SUMMER_YEAR = [
  0.079, 0.073, 0.078, 0.082, 0.093, 0.105, 0.112, 0.108, 0.089, 0.073, 0.05, 0.058,
];
/** Office — heating winter, comfort cooling summer, dip in July holidays. */
const OFFICE_YEAR = [
  0.099, 0.093, 0.09, 0.079, 0.075, 0.076, 0.055, 0.072, 0.08, 0.086, 0.093, 0.102,
];
/** Shop / restaurant — cooling load in summer, lighting/heating in winter. */
const RETAIL_YEAR = [
  0.088, 0.079, 0.082, 0.079, 0.083, 0.087, 0.089, 0.088, 0.082, 0.08, 0.081, 0.082,
];
/** Workshop — production driven, clear summer shutdown in July. */
const WORKSHOP_YEAR = [
  0.101, 0.095, 0.094, 0.082, 0.079, 0.078, 0.043, 0.073, 0.086, 0.089, 0.09, 0.09,
];

/* ------------------------------------------------------------------ */
/* Diurnal building blocks                                             */
/* ------------------------------------------------------------------ */

const h = (...v: number[]) => v;

/** Household base (no electric heat): morning + evening peak, weekday. */
const HOUSE_WEEKDAY = h(
  0.35, 0.32, 0.3, 0.3, 0.34, 0.55, 0.95, 1.55, 1.3, 0.85, 0.7, 0.7, 0.72, 0.7, 0.72, 0.9, 1.25,
  1.75, 1.95, 1.8, 1.5, 1.15, 0.75, 0.48,
);
/** Household base, weekend: later start, higher midday, softer peaks. */
const HOUSE_WEEKEND = h(
  0.4, 0.36, 0.33, 0.32, 0.34, 0.4, 0.55, 0.8, 1.1, 1.35, 1.4, 1.35, 1.3, 1.2, 1.15, 1.15, 1.3,
  1.55, 1.7, 1.6, 1.35, 1.1, 0.8, 0.55,
);

function addBlock(base: number[], hours: number[], amount: number): number[] {
  return base.map((v, i) => v + (hours.includes(i) ? amount : 0));
}

/* ------------------------------------------------------------------ */
/* Catalogue                                                           */
/* ------------------------------------------------------------------ */

export const LOAD_PROFILES: LoadProfileDef[] = [
  {
    id: "normal",
    label: "Normal villa",
    description:
      "Vanligt hushåll utan elvärme. Morgontopp innan jobbet och en tydlig kvällstopp, lugnare dagar på helgen.",
    audience: "customer",
    monthShare: FLAT_YEAR,
    shape: { weekday: HOUSE_WEEKDAY, weekend: HOUSE_WEEKEND },
  },
  {
    id: "evening-heavy",
    label: "Pendlarvilla, kvällstung",
    description:
      "Huset står nästan tomt mitt på dagen och allt händer på kvällen: mat, tvätt, dusch och tv.",
    audience: "customer",
    monthShare: DEFAULT_YEAR,
    shape: {
      weekday: h(
        0.34, 0.3, 0.28, 0.28, 0.32, 0.6, 1.15, 1.7, 0.85, 0.42, 0.36, 0.36, 0.4, 0.36, 0.42, 0.75,
        1.45, 2.15, 2.35, 2.1, 1.7, 1.25, 0.8, 0.48,
      ),
      weekend: h(
        0.4, 0.36, 0.32, 0.3, 0.32, 0.42, 0.6, 0.9, 1.15, 1.35, 1.35, 1.3, 1.25, 1.15, 1.1, 1.2,
        1.45, 1.8, 1.95, 1.8, 1.5, 1.2, 0.85, 0.55,
      ),
    },
  },
  {
    id: "day-heavy",
    label: "Hemma dagtid",
    description:
      "Någon är hemma hela dagen — hemarbete, småbarn eller pensionär. Jämn förbrukning från morgon till kväll.",
    audience: "customer",
    monthShare: FLAT_YEAR,
    shape: {
      weekday: h(
        0.4, 0.36, 0.34, 0.34, 0.38, 0.6, 0.9, 1.15, 1.4, 1.6, 1.65, 1.6, 1.55, 1.5, 1.45, 1.4,
        1.4, 1.5, 1.55, 1.4, 1.2, 0.95, 0.7, 0.5,
      ),
      weekend: h(
        0.42, 0.38, 0.35, 0.34, 0.36, 0.48, 0.7, 0.95, 1.2, 1.45, 1.55, 1.55, 1.5, 1.45, 1.4, 1.4,
        1.45, 1.55, 1.6, 1.45, 1.25, 1.0, 0.75, 0.55,
      ),
    },
  },
  {
    id: "heat-pump",
    label: "Värmepump",
    description:
      "Villa med värmepump. Kraftig morgonuppvärmning efter nattsänkningen och hög last hela vinterdagen.",
    audience: "customer",
    monthShare: HEAT_PUMP_YEAR,
    shape: { weekday: HOUSE_WEEKDAY, weekend: HOUSE_WEEKEND },
    winterShape: {
      weekday: h(
        0.5, 0.46, 0.44, 0.46, 0.85, 1.75, 2.85, 3.05, 1.85, 1.05, 0.85, 0.8, 0.8, 0.8, 0.9, 1.25,
        1.85, 2.4, 2.45, 2.05, 1.5, 1.05, 0.72, 0.55,
      ),
      weekend: h(
        0.55, 0.5, 0.47, 0.47, 0.75, 1.3, 2.05, 2.45, 2.05, 1.4, 1.1, 1.0, 1.0, 0.95, 1.05, 1.35,
        1.9, 2.4, 2.45, 2.05, 1.5, 1.1, 0.8, 0.6,
      ),
    },
    summerShape: {
      weekday: h(
        0.45, 0.42, 0.4, 0.4, 0.44, 0.6, 0.95, 1.35, 1.15, 0.85, 0.75, 0.75, 0.78, 0.75, 0.78, 0.9,
        1.15, 1.5, 1.6, 1.5, 1.3, 1.05, 0.75, 0.55,
      ),
      weekend: h(
        0.48, 0.44, 0.42, 0.41, 0.44, 0.5, 0.65, 0.9, 1.1, 1.25, 1.3, 1.25, 1.2, 1.15, 1.1, 1.1,
        1.2, 1.4, 1.5, 1.4, 1.25, 1.05, 0.8, 0.6,
      ),
    },
  },
  {
    id: "direct-electric",
    label: "Direktverkande el",
    description:
      "Villa med elradiatorer. Termostaterna slår till hårt på morgonen och kvällen när huset ska värmas upp.",
    audience: "customer",
    monthShare: DIRECT_YEAR,
    shape: { weekday: HOUSE_WEEKDAY, weekend: HOUSE_WEEKEND },
    winterShape: {
      weekday: h(
        0.42, 0.38, 0.36, 0.4, 1.0, 2.2, 3.5, 3.7, 2.0, 0.95, 0.7, 0.65, 0.65, 0.68, 0.82, 1.35,
        2.2, 3.05, 3.15, 2.5, 1.7, 1.05, 0.65, 0.48,
      ),
      weekend: h(
        0.46, 0.41, 0.38, 0.4, 0.85, 1.6, 2.6, 3.15, 2.5, 1.55, 1.1, 0.95, 0.95, 0.95, 1.1, 1.5,
        2.2, 3.0, 3.1, 2.45, 1.65, 1.1, 0.75, 0.52,
      ),
    },
    summerShape: {
      weekday: h(
        0.4, 0.37, 0.35, 0.35, 0.4, 0.6, 1.0, 1.5, 1.2, 0.8, 0.65, 0.65, 0.68, 0.65, 0.68, 0.85,
        1.2, 1.65, 1.8, 1.65, 1.4, 1.1, 0.75, 0.5,
      ),
      weekend: h(
        0.44, 0.4, 0.37, 0.36, 0.4, 0.46, 0.62, 0.88, 1.1, 1.3, 1.35, 1.3, 1.25, 1.15, 1.1, 1.15,
        1.3, 1.5, 1.6, 1.5, 1.3, 1.05, 0.8, 0.58,
      ),
    },
  },
  {
    id: "heat-pump-ev",
    label: "Värmepump + elbil",
    description:
      "Villa med värmepump och elbil som laddas på natten. Den tyngsta villatypen både i energi och effekt.",
    audience: "customer",
    monthShare: HEAT_PUMP_YEAR,
    shape: {
      weekday: addBlock(HOUSE_WEEKDAY, [23, 0, 1, 2], 2.2),
      weekend: addBlock(HOUSE_WEEKEND, [23, 0, 1, 2], 1.6),
    },
    winterShape: {
      weekday: addBlock(
        h(
          0.5, 0.46, 0.44, 0.46, 0.85, 1.75, 2.85, 3.05, 1.85, 1.05, 0.85, 0.8, 0.8, 0.8, 0.9, 1.25,
          1.85, 2.4, 2.45, 2.05, 1.5, 1.05, 0.72, 0.55,
        ),
        [23, 0, 1, 2],
        2.4,
      ),
      weekend: addBlock(
        h(
          0.55, 0.5, 0.47, 0.47, 0.75, 1.3, 2.05, 2.45, 2.05, 1.4, 1.1, 1.0, 1.0, 0.95, 1.05, 1.35,
          1.9, 2.4, 2.45, 2.05, 1.5, 1.1, 0.8, 0.6,
        ),
        [23, 0, 1, 2],
        1.7,
      ),
    },
  },
  {
    id: "ev-night",
    label: "Elbil, laddar natt",
    description:
      "Vanligt hushåll plus elbil som laddas i ett block under natten, oftast klart innan morgonen.",
    audience: "customer",
    monthShare: FLAT_YEAR,
    shape: {
      weekday: addBlock(HOUSE_WEEKDAY, [23, 0, 1, 2], 2.6),
      weekend: addBlock(HOUSE_WEEKEND, [23, 0, 1], 2.0),
    },
  },
  {
    id: "ev-evening",
    label: "Elbil, laddar direkt hem",
    description:
      "Vanligt hushåll plus elbil som sätts på laddning direkt efter jobbet — laddningen hamnar mitt i kvällstoppen.",
    audience: "customer",
    monthShare: FLAT_YEAR,
    shape: {
      weekday: addBlock(HOUSE_WEEKDAY, [17, 18, 19], 3.0),
      weekend: addBlock(HOUSE_WEEKEND, [13, 14, 15], 2.2),
    },
  },
  {
    id: "pool-summer",
    label: "Pool / sommarhus",
    description:
      "Pool och uteliv gör sommaren tyngst. Poolpumpen går i schemalagda block mitt på dagen.",
    audience: "customer",
    monthShare: SUMMER_YEAR,
    shape: { weekday: HOUSE_WEEKDAY, weekend: HOUSE_WEEKEND },
    summerShape: {
      weekday: addBlock(
        h(
          0.4, 0.36, 0.34, 0.33, 0.36, 0.5, 0.8, 1.15, 1.05, 0.85, 0.8, 0.8, 0.82, 0.8, 0.85, 1.0,
          1.2, 1.5, 1.6, 1.45, 1.2, 0.95, 0.7, 0.5,
        ),
        [10, 11, 12, 13, 14, 15],
        1.5,
      ),
      weekend: addBlock(
        h(
          0.42, 0.38, 0.35, 0.34, 0.36, 0.44, 0.6, 0.85, 1.05, 1.2, 1.25, 1.25, 1.2, 1.15, 1.15,
          1.2, 1.35, 1.55, 1.6, 1.45, 1.25, 1.0, 0.75, 0.55,
        ),
        [10, 11, 12, 13, 14, 15],
        1.5,
      ),
    },
  },
  {
    id: "office",
    label: "Kontor",
    description:
      "Arbetsplats med fasta kontorstider. Full drift 07–18 på vardagar och nästan tomt på helgen.",
    audience: "customer",
    monthShare: OFFICE_YEAR,
    shape: {
      weekday: h(
        0.28, 0.27, 0.27, 0.27, 0.3, 0.45, 1.1, 1.85, 2.15, 2.2, 2.2, 2.15, 2.0, 2.1, 2.15, 2.05,
        1.8, 1.35, 0.8, 0.5, 0.36, 0.31, 0.29, 0.28,
      ),
      weekend: h(
        0.26, 0.26, 0.26, 0.26, 0.26, 0.27, 0.3, 0.34, 0.38, 0.4, 0.4, 0.4, 0.4, 0.4, 0.38, 0.36,
        0.33, 0.3, 0.28, 0.27, 0.26, 0.26, 0.26, 0.26,
      ),
    },
    summerShape: {
      weekday: h(
        0.3, 0.29, 0.29, 0.29, 0.32, 0.45, 1.0, 1.7, 2.0, 2.15, 2.3, 2.4, 2.35, 2.4, 2.4, 2.2,
        1.85, 1.3, 0.8, 0.5, 0.38, 0.33, 0.31, 0.3,
      ),
      weekend: h(
        0.28, 0.28, 0.28, 0.28, 0.28, 0.29, 0.32, 0.36, 0.4, 0.44, 0.46, 0.48, 0.48, 0.48, 0.46,
        0.42, 0.38, 0.34, 0.31, 0.29, 0.28, 0.28, 0.28, 0.28,
      ),
    },
  },
  {
    id: "retail-restaurant",
    label: "Butik / restaurang",
    description:
      "Öppet alla dagar 09–20 med kyl och frys som drar dygnet runt. Ganska hög last även på natten.",
    audience: "customer",
    monthShare: RETAIL_YEAR,
    shape: {
      weekday: h(
        0.6, 0.58, 0.57, 0.57, 0.6, 0.7, 0.95, 1.15, 1.5, 1.7, 1.75, 1.8, 1.85, 1.8, 1.75, 1.75,
        1.8, 1.85, 1.8, 1.6, 1.2, 0.9, 0.72, 0.65,
      ),
      weekend: h(
        0.6, 0.58, 0.57, 0.57, 0.6, 0.68, 0.85, 1.0, 1.25, 1.6, 1.75, 1.8, 1.85, 1.85, 1.8, 1.75,
        1.7, 1.6, 1.4, 1.15, 0.9, 0.75, 0.68, 0.63,
      ),
    },
    summerShape: {
      weekday: h(
        0.72, 0.7, 0.68, 0.68, 0.7, 0.8, 1.05, 1.25, 1.6, 1.85, 1.95, 2.0, 2.05, 2.05, 2.0, 1.95,
        1.9, 1.9, 1.8, 1.6, 1.25, 0.98, 0.85, 0.78,
      ),
      weekend: h(
        0.72, 0.7, 0.68, 0.68, 0.7, 0.78, 0.95, 1.1, 1.35, 1.75, 1.95, 2.05, 2.1, 2.1, 2.05, 1.95,
        1.85, 1.7, 1.5, 1.25, 1.0, 0.85, 0.78, 0.74,
      ),
    },
  },
  {
    id: "workshop",
    label: "Verkstad / mindre verksamhet",
    description:
      "Produktion 07–16 på vardagar med tydliga toppar från maskiner och kompressor. Stängt på helgen.",
    audience: "customer",
    monthShare: WORKSHOP_YEAR,
    shape: {
      weekday: h(
        0.22, 0.21, 0.21, 0.21, 0.24, 0.5, 1.5, 2.6, 2.8, 2.5, 2.75, 2.4, 1.5, 2.5, 2.7, 2.35,
        1.25, 0.6, 0.38, 0.3, 0.25, 0.23, 0.22, 0.22,
      ),
      weekend: h(
        0.2, 0.2, 0.2, 0.2, 0.2, 0.21, 0.24, 0.28, 0.3, 0.3, 0.3, 0.3, 0.28, 0.28, 0.27, 0.26,
        0.24, 0.22, 0.21, 0.2, 0.2, 0.2, 0.2, 0.2,
      ),
    },
  },
  {
    id: "flat",
    label: "Jämn last (intern kontrollprofil)",
    description: "Nästan konstant baslast över dygnet. Används för intern kontroll, inte som kundtyp.",
    audience: "internal",
    monthShare: FLAT_YEAR,
    shape: {
      weekday: h(
        0.98, 0.97, 0.96, 0.96, 0.97, 0.99, 1.02, 1.04, 1.03, 1.01, 1.0, 1.0, 1.0, 1.0, 1.0, 1.01,
        1.03, 1.05, 1.05, 1.04, 1.02, 1.0, 0.99, 0.98,
      ),
      weekend: h(
        0.98, 0.97, 0.96, 0.96, 0.97, 0.99, 1.02, 1.04, 1.03, 1.01, 1.0, 1.0, 1.0, 1.0, 1.0, 1.01,
        1.03, 1.05, 1.05, 1.04, 1.02, 1.0, 0.99, 0.98,
      ),
    },
  },
  {
    id: "low-base-peaks",
    label: "Låg baslast / kraftiga toppar (internt stresstest)",
    description:
      "Extremprofil med mycket låg baslast och korta höga toppar. Endast stresstest av dimensioneringen.",
    audience: "internal",
    monthShare: FLAT_YEAR,
    shape: {
      weekday: h(
        0.35, 0.32, 0.3, 0.3, 0.32, 0.5, 1.5, 2.1, 0.9, 0.4, 0.35, 0.35, 0.55, 0.4, 0.35, 0.4, 1.1,
        2.3, 2.4, 1.3, 0.7, 0.5, 0.4, 0.37,
      ),
      weekend: h(
        0.35, 0.32, 0.3, 0.3, 0.32, 0.4, 0.7, 1.2, 1.0, 0.6, 0.5, 0.5, 0.7, 0.55, 0.5, 0.6, 1.2,
        2.1, 2.2, 1.3, 0.8, 0.55, 0.42, 0.38,
      ),
    },
  },
];

export const LOAD_PROFILE_MAP: Record<LoadProfileShape, LoadProfileDef> = Object.fromEntries(
  LOAD_PROFILES.map((p) => [p.id, p]),
) as Record<LoadProfileShape, LoadProfileDef>;

/** Profiles intended for end users (Mr. Battery Doc). */
export const CUSTOMER_LOAD_PROFILES = LOAD_PROFILES.filter((p) => p.audience === "customer");
/** Profiles kept for lab work and regression tests only. */
export const INTERNAL_LOAD_PROFILES = LOAD_PROFILES.filter((p) => p.audience === "internal");

export function getLoadProfile(id: LoadProfileShape): LoadProfileDef {
  return LOAD_PROFILE_MAP[id] ?? LOAD_PROFILE_MAP["normal"]!;
}

/** Diurnal set that applies for a given month (1-12). */
export function diurnalSetFor(def: LoadProfileDef, month: number): DiurnalSet {
  const season = seasonOfMonth(month);
  if (season === "winter" && def.winterShape) return def.winterShape;
  if (season === "summer" && def.summerShape) return def.summerShape;
  if (season === "shoulder" && (def.winterShape || def.summerShape)) {
    const w = def.winterShape ?? def.shape;
    const s = def.summerShape ?? def.shape;
    return {
      weekday: w.weekday.map((v, i) => (v + (s.weekday[i] ?? v)) / 2),
      weekend: w.weekend.map((v, i) => (v + (s.weekend[i] ?? v)) / 2),
    };
  }
  return def.shape;
}

/**
 * Raw relative weight of one hour. Never negative, never NaN. The absolute level
 * is meaningless — only relations inside a month matter, since every month is
 * normalised exactly to the entered kWh.
 */
export function profileHourWeight(
  id: LoadProfileShape,
  month: number,
  weekend: boolean,
  hourOfDay: number,
): number {
  const set = diurnalSetFor(getLoadProfile(id), month);
  const arr = weekend ? set.weekend : set.weekday;
  const v = arr[((hourOfDay % 24) + 24) % 24];
  return Number.isFinite(v) && (v as number) > 0 ? (v as number) : 0;
}

/**
 * Representative 24 h shape of a profile, normalised to mean 1.
 * Used for analysis/UI. Defaults to the annual-average weekday shape.
 */
export function hourWeightsOf(
  id: LoadProfileShape,
  opts?: { dayType?: "weekday" | "weekend"; season?: Season },
): number[] {
  const def = getLoadProfile(id);
  const dayType = opts?.dayType ?? "weekday";
  const months = opts?.season
    ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((m) => seasonOfMonth(m) === opts.season)
    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const acc = new Array<number>(24).fill(0);
  for (const m of months) {
    const set = diurnalSetFor(def, m);
    const arr = dayType === "weekend" ? set.weekend : set.weekday;
    for (let i = 0; i < 24; i++) acc[i] = (acc[i] ?? 0) + (arr[i] ?? 0);
  }
  const mean = acc.reduce((a, b) => a + b, 0) / 24;
  return mean > 0 ? acc.map((v) => v / mean) : acc.map(() => 1);
}

/**
 * Applies a profile to a consumption input: the diurnal shape AND the monthly
 * distribution are taken from the profile, while the annual kWh stays exactly
 * the same as before (so profiles are directly comparable).
 */
export function applyLoadProfile(
  consumption: ConsumptionInput,
  id: LoadProfileShape,
): ConsumptionInput {
  const annual =
    consumption.annualKWh && consumption.annualKWh > 0
      ? consumption.annualKWh
      : consumption.monthlyKWh.reduce((a, b) => a + b, 0);
  return {
    ...consumption,
    shape: id,
    annualKWh: annual,
    monthlyKWh: spreadAnnual(annual, getLoadProfile(id).monthShare),
    monthlyIsModelled: true,
  };
}
