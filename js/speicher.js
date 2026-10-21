/* ==========================================================
   speicher.js – Daten lesen und schreiben
   ----------------------------------------------------------
   Alle Daten liegen im "localStorage" des Browsers. Das ist eine
   kleine Ablage, die nur auf diesem Gerät existiert. Nichts davon
   geht ins Internet.

   Aufbau der gespeicherten Daten:
   {
     datenVersion: 1,
     einstellungen: { waehrung, monatsbeginn, design },
     kategorien:   [ { id, name, typ, geaendertAm } ],
     buchungen:    [ { id, datum, betragCent, typ, kategorieId, notiz, sonder, fixkostenId, geaendertAm } ],
     fixkosten:    [ { id, name, betragCent, typ, kategorieId, rhythmus, faelligAm, aktiv, startdatum, enddatum, geaendertAm } ]
   }
   ========================================================== */

// Unter diesem Namen liegen die Daten im Browser
const SPEICHER_SCHLUESSEL = 'clearpocket-daten';

// Version des Datenaufbaus. Ändert sich der Aufbau später,
// erhöhen wir diese Zahl und bauen alte Daten automatisch um.
const DATEN_VERSION = 1;

// Die Standard-Kategorien für den allerersten Start
const STANDARD_KATEGORIEN = {
  ausgabe: [
    'Wohnen', 'Lebensmittel', 'Essen gehen', 'Mobilität/Auto', 'Versicherungen',
    'Abos & Verträge', 'Gesundheit', 'Kleidung', 'Freizeit & Hobbys', 'Urlaub',
    'Geschenke', 'Haushalt', 'Bildung', 'Sonstiges'
  ],
  einnahme: [
    'Gehalt', 'Nebenjob', 'Rückerstattungen', 'Geschenke', 'Zinsen/Dividenden', 'Sonstiges'
  ],
  sparen: [
    'Notgroschen', 'Tagesgeld', 'Depot/ETF', 'Altersvorsorge', 'Sonstiges'
  ]
};

// Erzeugt eine eindeutige Kennung (ID) für einen neuen Eintrag
function neueId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Ersatz für ältere Browser: Zeit + Zufallszahl
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// Aktueller Zeitpunkt als Text, z. B. "2026-10-21T19:30:00.000Z"
function jetzt() {
  return new Date().toISOString();
}

// Baut die Daten für den allerersten Start zusammen
function standardDaten() {
  const kategorien = [];
  for (const typ of Object.keys(STANDARD_KATEGORIEN)) {
    for (const name of STANDARD_KATEGORIEN[typ]) {
      kategorien.push({ id: neueId(), name: name, typ: typ, geaendertAm: jetzt() });
    }
  }
  return {
    datenVersion: DATEN_VERSION,
    einstellungen: { waehrung: 'EUR', monatsbeginn: 1, design: 'auto' },
    kategorien: kategorien,
    buchungen: [],
    fixkosten: []
  };
}

// Liest die Daten aus dem Browser. Gibt es noch keine, werden Standard-Daten angelegt.
function ladeDaten() {
  const text = localStorage.getItem(SPEICHER_SCHLUESSEL);

  // Allererster Start: noch nichts gespeichert
  if (text === null) {
    const daten = standardDaten();
    speichereDaten(daten);
    return daten;
  }

  try {
    const daten = JSON.parse(text);
    return migriereDaten(daten);
  } catch (fehler) {
    // Die gespeicherten Daten sind beschädigt. Wir überschreiben sie NICHT,
    // sondern legen eine Sicherheitskopie an und melden den Fehler.
    localStorage.setItem(SPEICHER_SCHLUESSEL + '-beschaedigt-' + Date.now(), text);
    throw new Error('Die gespeicherten Daten konnten nicht gelesen werden. Eine Kopie wurde aufbewahrt.');
  }
}

// Bringt Daten aus einer älteren Version auf den neuesten Stand.
// Noch gibt es nur Version 1 – hier kommen später die Umbau-Schritte hin.
function migriereDaten(daten) {
  if (daten.datenVersion > DATEN_VERSION) {
    throw new Error('Diese Daten stammen aus einer neueren App-Version. Bitte die App neu laden.');
  }
  return daten;
}

// Schreibt die Daten in den Browser
function speichereDaten(daten) {
  localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify(daten));
}

// Bittet den Browser, unsere Daten nicht von selbst aufzuräumen,
// wenn auf dem Gerät der Speicher knapp wird
function bitteUmDauerhaftenSpeicher() {
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist();
  }
}
