import { describe, expect, it } from "vitest";

import { spreadAnnual } from "../lab/defaults";
import { getLoadProfile } from "../lab/loadProfiles";
import { toLabConfig } from "./input";

describe("annual consumption profile scaling", () => {
  it("uses the selected profile's monthly weights and preserves the exact annual total", () => {
    const annualKWh = 20_000;
    const profile = "heat-pump" as const;
    const cfg = toLabConfig({ consumption: { annualKWh, profile } });

    expect(cfg.consumption.monthlyKWh).toEqual(
      spreadAnnual(annualKWh, getLoadProfile(profile).monthShare),
    );
    expect(cfg.consumption.monthlyKWh.reduce((sum, value) => sum + value, 0)).toBe(annualKWh);
    expect(cfg.consumption.monthlyIsModelled).toBe(true);
  });

  it("keeps explicit monthly readings unchanged while retaining the selected hourly profile", () => {
    const monthlyKWh = Array.from({ length: 12 }, (_, month) => 700 + month * 37);
    const cfg = toLabConfig({
      consumption: { annualKWh: 999_999, monthlyKWh, profile: "pool-summer" },
    });

    expect(cfg.consumption.monthlyKWh).toEqual(monthlyKWh);
    expect(cfg.consumption.annualKWh).toBe(999_999);
    expect(cfg.consumption.shape).toBe("pool-summer");
    expect(cfg.consumption.monthlyIsModelled).toBe(false);
  });

  it("changes modelled months, but never explicit months, when the profile changes", () => {
    const annualKWh = 20_000;
    const explicit = Array.from({ length: 12 }, () => annualKWh / 12);

    const annualHeatPump = toLabConfig({ consumption: { annualKWh, profile: "heat-pump" } });
    const annualPool = toLabConfig({ consumption: { annualKWh, profile: "pool-summer" } });
    expect(annualHeatPump.consumption.monthlyKWh).not.toEqual(
      annualPool.consumption.monthlyKWh,
    );

    const monthlyHeatPump = toLabConfig({
      consumption: { monthlyKWh: explicit, profile: "heat-pump" },
    });
    const monthlyPool = toLabConfig({
      consumption: { monthlyKWh: explicit, profile: "pool-summer" },
    });
    expect(monthlyHeatPump.consumption.monthlyKWh).toEqual(explicit);
    expect(monthlyPool.consumption.monthlyKWh).toEqual(explicit);
  });
});