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
