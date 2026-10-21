/* ==========================================================
   buchungen.js – Rechnen mit Buchungen
   ----------------------------------------------------------
   Ein Datum speichern wir als Text "JJJJ-MM-TT", z. B. "2026-10-21".
   Ein Monat ist dann einfach der Anfang davon: "2026-10".
   ========================================================== */

// Höchster erlaubter Betrag: 99.999.999,99 € (schützt vor Tippfehlern)
const MAX_BETRAG_CENT = 9999999999;

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

// Verwandelt einen eingetippten Betrag in Cent.
// Erlaubt: "12,50"  "12.50"  "1.234,56"  "1234"  "0,5"
// Gibt null zurück, wenn der Text kein gültiger Betrag ist.
function betragZuCent(text) {
  let t = String(text).trim().replace(/\s|€/g, '');
  if (t === '') return null;

  if (t.includes(',')) {
    // Deutsches Format: Punkte sind Tausender-Trenner, Komma trennt die Cents
    t = t.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    // Nur Punkte in Dreiergruppen, z. B. "1.234" → das sind Tausender
    t = t.replace(/\./g, '');
  }
  // Übrig bleibt z. B. "1234.56" – höchstens 2 Nachkommastellen erlaubt
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;

  // Euro und Cent getrennt umrechnen, damit keine Rundungsfehler entstehen
  const [euro, cent = ''] = t.split('.');
  const ergebnis = Number(euro) * 100 + Number(cent.padEnd(2, '0'));
  if (ergebnis <= 0 || ergebnis > MAX_BETRAG_CENT) return null;
  return ergebnis;
}

// Findet eine Kategorie anhand ihrer ID
function findeKategorie(daten, kategorieId) {
  return daten.kategorien.find(k => k.id === kategorieId);
}

// Alle Kategorien eines Typs ("ausgabe", "einnahme" oder "sparen")
function kategorienVomTyp(daten, typ) {
  return daten.kategorien.filter(k => k.typ === typ);
}

// Speichert eine Buchung: neu anlegen (ohne id) oder eine bestehende ändern (mit id)
function speichereBuchung(daten, eingabe) {
  const buchung = {
    id: eingabe.id || neueId(),
    datum: eingabe.datum,
    betragCent: eingabe.betragCent,
    typ: eingabe.typ,
    kategorieId: eingabe.kategorieId,
    notiz: eingabe.notiz || '',
    sonder: Boolean(eingabe.sonder),
    fixkostenId: eingabe.fixkostenId || null,
    geaendertAm: jetzt()
  };

  const stelle = daten.buchungen.findIndex(b => b.id === buchung.id);
  if (stelle >= 0) {
    daten.buchungen[stelle] = buchung;   // ändern
  } else {
    daten.buchungen.push(buchung);       // neu
  }
  speichereDaten(daten);
  return buchung;
}

// Löscht eine Buchung endgültig
function loescheBuchung(daten, id) {
  daten.buchungen = daten.buchungen.filter(b => b.id !== id);
  speichereDaten(daten);
}
