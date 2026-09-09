/**
 * Consumer information shown in the collapsible "Viktigt att känna till" section
 * on the result step. Pure presentation copy — no calculation is affected.
 * The app is Swedish-only today; keep all strings here so they are easy to
 * route through a translation system later.
 */
export const IMPORTANT_INFO_TITLE = "Viktigt att känna till";

export const IMPORTANT_INFO_POINTS: string[] = [
  "Resultatet är en uppskattning. Verkligt utfall kan skilja sig från beräkningen.",
  "Elpriser och nättariffer varierar. Kontrollera ditt eget avtal och elnätsföretagets villkor.",
  "Stödtjänstintäkter baseras på historiska marknadspriser från 2025. Framtida priser kan bli både högre och lägre.",
  "En del av stödtjänstersättningen går till aggregator, balansansvarig eller andra marknadsaktörer. Den faktiska kundersättningen är därför lägre än det beräknade marknadsvärdet.",
  "Deltagande på stödtjänstmarknaden är inte garanterat. Tekniska krav, marknadstillträde och avtal kan krävas.",
  "Batteriets verkliga prestanda och lönsamhet kan avvika beroende på produkt, installation, degradering och användning.",
  "Anlita alltid en behörig eller certifierad elinstallatör för installation och elarbeten.",
];

export const IMPORTANT_INFO_FOOTER =
  "Battery Doc är ett beräknings- och beslutsstöd och ersätter inte offert, teknisk projektering eller avtalsvillkor.";
