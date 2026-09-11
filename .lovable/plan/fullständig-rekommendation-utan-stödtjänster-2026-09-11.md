# Fullständig rekommendation utan stödtjänster

## Mål
Raden under ”Bäst val” ska visa den batterikapacitet och effekt som modellen faktiskt skulle rekommendera om stödtjänster var avstängda, inte bara optimera effekten för den redan valda kapaciteten.

## Genomförande
- Skapa ett FCR-avstängt motfall från samma indata och kör hela befintliga dimensioneringskedjan på nytt.
- Använd motfallets rekommenderade kWh och kW i resultatkortet och i sparade historikposter.
- Behåll ordinarie rekommendation, motorregler, prisdata, ekonomi, köpflöde och PDF oförändrade.
- Anpassa den befintliga resultatpresentationen så att dess jämförelser och förklaringar använder det fullständiga motfallet konsekvent.

## Verifiering
- Lägg regressionstest som bevisar att både kapacitet och effekt kan ändras och matchar en separat full beräkning med stödtjänster avstängda.
- Kontrollera att motfallet har noll stödtjänstreservation och noll stödtjänstintäkt.
- Kör berörda tester, hela testsviten och typkontroll.
