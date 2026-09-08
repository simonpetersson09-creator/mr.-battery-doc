# Battery Engine v1.0.0 — Frozen Export Manifest

**Status: FROZEN.** This document is the export contract for Battery Engine v1.0.0.
Battery Engine v1.0.0 is the **source of truth** for Mr. Battery Doc. The app imports the
engine exactly as frozen here and verifies against the same Golden Masters.

- **Version:** 1.0.0 (`BATTERY_ENGINE_VERSION` in `version.ts`, exported via `index.ts`,
  stamped on every result as `engineVersion`)
- **Freeze date:** 2026-09-08
- **Test status at freeze:** 216/216 passing
- **Golden Master version:** 12 cases, updated for the v1.0.0 audit corrections
- **Typecheck:** pass
- **Build:** pass

## Canonical reference case (standardvilla)

| Metric | Frozen value |
| --- | --- |
| Recommended capacity / power | 15 kWh / 3 kW |
| Total operating benefit | 2 271,21 SEK/year |
| Energy balance | OK (residual 0) |

Frozen assumptions and limits:

- **200 kW cap** on offered FCR-D up power and on the product power ladder.
- Historical FCR-D up price series: **Sweden 2025**, 8 760 hours, EUR/MW/h
  (historical reference data — not a forecast).
- Swedish peak tariff schablon: **30 SEK/kW/month** (annualised placeholder, 360 SEK/kW/year; not the actual or average Swedish demand charge, a user value always wins, 0 is valid).
- EUR/SEK assumption: **11.30 SEK/EUR**.

## Public entry point

Consumers import only from `src/lib/battery-engine/index.ts`. The export layer reads the
frozen internals under `src/lib/lab/` and `src/lib/lab/ancillary/`; UI must never import
those internals directly. Numerical migration tolerances are defined in
`version.ts` (`BATTERY_ENGINE_TOLERANCES`): discrete results must match exactly.

## Release notes — the six audit corrections (battery-lab-strategikonflikt-audit.md)

1. **F1 — FCR readiness timing.** Availability is now judged over the whole hour
   (worst case of hour start/end SOC against the strict delivery floor), with the floor
   protected against next hour's self-discharge. Availability for the main case rose from
   ~65 % to 100 % with held FCR power 1.5 kW — a consequence of the corrected timing, not
   of crediting future charging.
2. **F2 — Signed monthly peak savings.** Raised monthly peaks now produce negative
   peak savings instead of being clamped to zero. Standardvilla total operating benefit
   moved from 2 274,51 to 2 271,21 SEK/year. Each month's effect is counted exactly once.
3. **F3 — FCR readiness charging priority documented.** Readiness charging keeps
   precedence over the peak threshold, always within hard battery and grid limits; its
   energy cost and any raised peak cost are priced once, never double-counted.
4. **F4 — Simultaneous import/export eliminated.** All grid charging now consumes free
   PV surplus before importing, fixing 3 042 simultaneous import/export hours
   (0,14 kWh/year) at the source. Hourly energy balance preserved.
5. **F5 — Dormant pre-charge branch removed.** No foresight-based pre-charging ahead of
   future reservations is modelled; documented as a model limitation.
6. **F6 — Sweep wording corrected.** 1.5 kW is described as the best of the tested sweep
   candidates under the test assumptions, not a general recommendation. Full power
   reservation correctly leaves zero discharge capacity for energy strategies.

Sizing, grid status and cycles are unchanged by the corrections. The opportunity cost
remains diagnostics only; annual economics still sum energy benefit + signed peak
benefit + FCR gross exactly once.

## What Mr. Battery Doc must sync

- `src/lib/battery-engine/` (full export layer, incl. `version.ts` and this manifest)
- `src/lib/lab/` and `src/lib/lab/ancillary/` (frozen internals the export layer uses)
- The Golden Master test cases (`src/lib/battery-engine/goldenMaster.test.ts`)
- Dev dependency: `vitest` (test runner only)

## Freeze rules

No changes to dispatch, SOC, profiles, sizing, economics, FCR, peak shaving, grid logic,
defaults, product steps, or the 200 kW cap without a new versioned release.
