import type { GridAssessment, GridAssessmentThresholds, SimResult } from "./types";

/**
 * Grid assessment is deliberately SEPARATE from the battery recommendation.
 *
 * The battery kWh/kW recommendation is produced by the sizing engine and is never
 * reduced because the connection is small. This module only classifies what the
 * connection means for the system in practice, and does so primarily on LOST ENERGY
 * in kWh and percent — binding hours is secondary information.
 *
 * Thresholds (initial levels, all configurable):
 *  - exportLossPctMinor 0.5 %  : below this the loss is within model noise / irrelevant.
 *  - exportLossPctMaterial 3 % : a materially large share of a year's production.
 *  - batteryBlockedPctOfCharge 1 % : the connection measurably holds the battery back.
 *  - unservedPctOfLoad 0.1 %   : the connection could not cover the household load.
 */
export const DEFAULT_GRID_ASSESSMENT_THRESHOLDS: GridAssessmentThresholds = {
  exportLossPctMinor: 0.5,
  exportLossPctMaterial: 3,
  batteryBlockedPctOfCharge: 1,
  unservedPctOfLoad: 0.1,
};

const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);
const fmt = (n: number, d = 0) => n.toLocaleString("sv-SE", { maximumFractionDigits: d });

/**
 * @param withBattery simulation of the RECOMMENDED battery
 * @param baseline    simulation of the SAME year without battery (identical series/limits)
 */
export function assessGrid(
  withBattery: SimResult,
  baseline: SimResult,
  thresholds: GridAssessmentThresholds = DEFAULT_GRID_ASSESSMENT_THRESHOLDS,
): GridAssessment {
  const g = withBattery.grid;
  const possiblePvKWh = withBattery.annualPvKWh;

  // ---- import side: split limited kWh into unserved load and blocked battery charging
  const unservedKWh = withBattery.gridUnservedKWh;
  const batteryChargeBlockedKWh = Math.max(0, g.importLimitedKWh - unservedKWh);
  const unservedPctOfLoad = pct(unservedKWh, withBattery.annualLoadKWh);
  const batteryBlockedPctOfCharge = pct(batteryChargeBlockedKWh, withBattery.chargedKWh);

  // ---- export side
  const exportCurtailedKWh = g.exportCurtailedKWh;
  const exportCurtailedPctOfPv = pct(exportCurtailedKWh, possiblePvKWh);

  // ---- battery effect on grid limitation (never added to normal solar shifting)
  const potentialCurtailmentKWh = baseline.gridBlockedKWh;
  const savedByBatteryKWh = Math.max(0, potentialCurtailmentKWh - exportCurtailedKWh);
  const savedPctOfPotential = pct(savedByBatteryKWh, potentialCurtailmentKWh);

  // ---- non-overlapping solar split: direct + stored + exported + limited (+ residual)
  const solarSplit = {
    directToLoadKWh: withBattery.directPvToLoadKWh,
    storedInBatteryKWh: withBattery.chargedFromPvKWh,
    exportedKWh: withBattery.pvExportKWh,
    limitedByGridKWh: exportCurtailedKWh,
    batteryLossesKWh: withBattery.lossesKWh,
    possibleKWh: possiblePvKWh,
    residualKWh: 0,
  };
  solarSplit.residualKWh =
    possiblePvKWh -
    (solarSplit.directToLoadKWh +
      solarSplit.storedInBatteryKWh +
      solarSplit.exportedKWh +
      solarSplit.limitedByGridKWh);

  // ---- classification (energy first, hours never decide)
  const batteryLimited =
    batteryBlockedPctOfCharge >= thresholds.batteryBlockedPctOfCharge ||
    unservedPctOfLoad >= thresholds.unservedPctOfLoad;
  const exportMaterial = exportCurtailedPctOfPv >= thresholds.exportLossPctMaterial;
  const exportMinor =
    !exportMaterial && exportCurtailedPctOfPv >= thresholds.exportLossPctMinor;

  const status: GridAssessment["status"] = batteryLimited
    ? exportMaterial
      ? "combined"
      : "battery-limited"
    : exportMaterial
      ? "export-limited"
      : exportMinor
        ? "export-limited-minor"
        : "none";

  const TEXTS: Record<GridAssessment["status"], { headline: string; detail: string }> = {
    none: {
      headline: "Anslutningen räcker för hela anläggningen.",
      detail: "Elanslutningen påverkar inte anläggningens funktion i någon praktisk omfattning.",
    },
    "export-limited-minor": {
      headline:
        "Anslutningen räcker för batteriet. En liten del av solelen kan inte skickas ut på nätet.",
      detail:
        "Anläggningen fungerar i övrigt normalt. Begränsningen beror på solelens toppeffekt i förhållande till elanslutningen, inte på batteriets storlek.",
    },
    "export-limited": {
      headline:
        "Anslutningen räcker för batteriet, men begränsar solinmatningen under delar av året.",
      detail:
        "En märkbar del av solelen kan inte skickas ut på nätet. Det beror på solanläggningens storlek i förhållande till elanslutningen — batteriet är rätt dimensionerat.",
    },
    "battery-limited": {
      headline: "Anslutningen begränsar hur mycket batteriet kan laddas eller laddas ur.",
      detail:
        "Batteriets rekommenderade storlek står kvar; effekten hålls automatiskt inom anslutningens gräns. En större anslutning skulle ge lite mer nytta.",
    },
    combined: {
      headline: "Anslutningen begränsar både batteriets drift och solinmatningen.",
      detail:
        "Batteriets rekommenderade storlek står kvar. En större huvudsäkring ger både mer solel ut på nätet och mer utrymme för batteriet.",
    },
  };

  const { headline, detail } = TEXTS[status];

  // Primary user-facing consequences: energy first, hours last.
  const consequences: string[] = [];
  if (exportCurtailedKWh > 0.5)
    consequences.push(
      `Beräknad nätbegränsning: ${fmt(exportCurtailedKWh)} kWh/år (${fmt(
        exportCurtailedPctOfPv,
        1,
      )} % av möjlig solproduktion ${fmt(possiblePvKWh)} kWh).`,
    );
  if (savedByBatteryKWh > 0.5)
    consequences.push(
      `Batteriet minskar nätbegränsningen med ${fmt(savedByBatteryKWh)} kWh/år (${fmt(
        savedPctOfPotential,
        1,
      )} % mindre än utan batteri, ${fmt(potentialCurtailmentKWh)} kWh).`,
    );
  if (batteryChargeBlockedKWh > 0.5)
    consequences.push(
      `Anslutningen bromsade batteriets laddning med ${fmt(
        batteryChargeBlockedKWh,
      )} kWh/år (${fmt(batteryBlockedPctOfCharge, 1)} % av laddad energi).`,
    );
  if (unservedKWh > 0.5)
    consequences.push(
      `Elanslutningen räckte inte till hushållets behov ${fmt(unservedKWh)} kWh/år (${fmt(
        unservedPctOfLoad,
        2,
      )} % av årsförbrukningen).`,
    );
  if (g.exportBoundHours > 0 || g.importBoundHours > 0)
    consequences.push(
      `Sekundärt: gränsen nås ${fmt(g.exportBoundHours)} timmar vid inmatning och ${fmt(
        g.importBoundHours,
      )} timmar vid uttag av årets 8 760 timmar.`,
    );

  return {
    status,
    headline,
    detail,
    consequences,
    recommendedCapacityKWh: withBattery.capacityKWh,
    recommendedPowerKw: withBattery.powerKw,
    physicalImportKw: g.physicalImportKw,
    physicalExportKw: g.physicalExportKw,
    operationalImportKw: g.operationalImportKw,
    operationalExportKw: g.operationalExportKw,
    maxActualImportKw: g.maxActualImportKw,
    maxActualExportKw: g.maxActualExportKw,
    importBoundHours: g.importBoundHours,
    exportBoundHours: g.exportBoundHours,
    exportCurtailedKWh,
    exportCurtailedPctOfPv,
    possiblePvKWh,
    unservedKWh,
    unservedPctOfLoad,
    batteryChargeBlockedKWh,
    batteryBlockedPctOfCharge,
    potentialCurtailmentWithoutBatteryKWh: potentialCurtailmentKWh,
    actualCurtailmentWithBatteryKWh: exportCurtailedKWh,
    curtailmentSavedByBatteryKWh: savedByBatteryKWh,
    curtailmentSavedPctOfPotential: savedPctOfPotential,
    solarSplit,
    thresholds,
  };
}
