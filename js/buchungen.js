/* ==========================================================
   buchungen.js – Rechnen mit Buchungen
   ----------------------------------------------------------
   Ein Datum speichern wir als Text "JJJJ-MM-TT", z. B. "2026-10-21".
   Ein Monat ist dann einfach der Anfang davon: "2026-10".
   ========================================================== */

// Macht aus Jahr und Monat (1–12) den Monats-Text, z. B. (2026, 3) → "2026-03"
function monatsSchluessel(jahr, monat) {
  return jahr + '-' + String(monat).padStart(2, '0');
}

// Alle Buchungen, deren Datum im angegebenen Monat liegt
function buchungenImMonat(daten, jahr, monat) {
  const schluessel = monatsSchluessel(jahr, monat);
  return daten.buchungen.filter(b => b.datum.startsWith(schluessel));
}

// Rechnet die vier Zahlen der Monatsübersicht aus (alles in Cent):
//   Einnahmen − Ausgaben − Sparen = übrig (frei verfügbar)
function monatsSummen(daten, jahr, monat) {
  const summen = { einnahmen: 0, ausgaben: 0, sparen: 0, uebrig: 0 };

  for (const b of buchungenImMonat(daten, jahr, monat)) {
    if (b.typ === 'einnahme') summen.einnahmen += b.betragCent;
    if (b.typ === 'ausgabe')  summen.ausgaben  += b.betragCent;
    if (b.typ === 'sparen')   summen.sparen    += b.betragCent;
  }

  summen.uebrig = summen.einnahmen - summen.ausgaben - summen.sparen;
  return summen;
}
