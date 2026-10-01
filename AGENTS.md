<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Google Play purchases are verified server-side by purchase token (Developer API); one-time tokens are bound to one calculation in a server-only table — prevents replay and client-asserted unlocks.
- Countries whose ancillary markets lack verified products/prices are listed in `src/lib/lab/ancillary/countryMarkets.ts`; they get their own empty market profile, the reserve strategy is not sent to the engine, and revenue is 0 — never another country's rules or prices.
- Connection type (1-phase 230 V / 3-phase 400 V) is per-country config (`phaseOptions`); countries without options stay 3-phase, so their engine input is unchanged.
- Connection types are `PhaseOption`s with a stable id ("1x230", "3x230", "3x400"); grid power is derived from phases × voltage × fuse, never from country name — Belgium has two 3-phase systems.
- FCR Cooperation countries model symmetric FCR with their own `FCR_<CC>_<year>` series in `prices/fcrCooperation.ts` (explicit per-country map, block price/4 = EUR/MW/h in one place, local-day blocks → 8760); a country without its own series gets null and revenue 0 — no fallback.
- FCR Cooperation countries reuse the German symmetric market profile (`DE_MARKET` services) with only `enduranceHours` overridden from `FCR_ENDURANCE_HOURS` — one engine, no country-specific reserve logic.
- Countries without verified tariffs use neutral 0 economy values (`economyVerified: false`) and the generic fuse-step list — never values copied from another country.
- Symmetric FCR plans are clipped to rating / (1 + NEM share) before dispatch, and the dispatch runs storage management (charge/discharge towards the `solveAncillarySoc` working point using only power left after the FCR capacity) for symmetric products only — keeps offered = holdable power and makes pure-reserve years cyclic without touching Nordic upward/up-and-down logic.
- FCR reservation tie tolerance is an economic amount defined in SEK and converted to the economy's currency via the central rate table before comparing candidates — the currency must never change the chosen FCR level.
