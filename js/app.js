/* ==========================================================
   app.js – Start der App, Anzeige und Bedienung
   ========================================================== */

// --- Daten laden ---
let daten;
try {
  daten = ladeDaten();
} catch (fehler) {
  alert(fehler.message);
  daten = standardDaten();   // nur zum Anzeigen, wird nicht gespeichert
}
bitteUmDauerhaftenSpeicher();

// --- Was gerade angezeigt wird ---
const heute = new Date();
const zustand = {
  jahr: heute.getFullYear(),
  monat: heute.getMonth() + 1,   // JavaScript zählt Monate ab 0, wir ab 1
  filterKategorie: '',           // leer = alle Kategorien
  bearbeiteId: null              // ID der Buchung im Formular, null = neue Buchung
};

// Kurzschreibweise, um ein Element über seine id zu finden
function el(id) {
  return document.getElementById(id);
}

// ==========================================================
// Hilfsfunktionen für Text und Datum
// ==========================================================

// Verwandelt Cent in einen Euro-Text, z. B. 123456 → "1.234,56 €"
function alsEuro(cent) {
  return (cent / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

// Name des Monats, z. B. "Oktober 2026"
function monatsName(jahr, monat) {
  return new Date(jahr, monat - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
}

// Macht aus einem Date-Objekt den Text "JJJJ-MM-TT" (nach deutscher Ortszeit)
function datumAlsText(datum) {
  return monatsSchluessel(datum.getFullYear(), datum.getMonth() + 1) + '-' +
         String(datum.getDate()).padStart(2, '0');
}

// Macht aus "2026-10-21" eine Überschrift wie "Mi., 21. Oktober"
function datumAlsUeberschrift(text) {
  const [j, m, t] = text.split('-').map(Number);
  return new Date(j, m - 1, t).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' });
}

// Name einer Kategorie (oder "Ohne Kategorie", falls sie gelöscht wurde)
function kategorieName(kategorieId) {
  const k = findeKategorie(daten, kategorieId);
  return k ? k.name : 'Ohne Kategorie';
}

// ==========================================================
// Monatswechsel
// ==========================================================

// Einen Monat vor (+1) oder zurück (-1) gehen
function wechsleMonat(schritt) {
  zustand.monat += schritt;
  if (zustand.monat > 12) { zustand.monat = 1;  zustand.jahr += 1; }
  if (zustand.monat < 1)  { zustand.monat = 12; zustand.jahr -= 1; }
  aktualisiereAnzeige();
}

// Zeichnet alles neu, was vom gewählten Monat abhängt
function aktualisiereAnzeige() {
  for (const name of document.querySelectorAll('.monat-name')) {
    name.textContent = monatsName(zustand.jahr, zustand.monat);
  }
  zeigeUebersicht();
  zeigeBuchungsliste();
}

// ==========================================================
// Bereich "Übersicht"
// ==========================================================

function zeigeUebersicht() {
  const summen = monatsSummen(daten, zustand.jahr, zustand.monat);
  const anzahl = buchungenImMonat(daten, zustand.jahr, zustand.monat).length;

  el('summe-uebrig').textContent    = alsEuro(summen.uebrig);
  el('summe-einnahmen').textContent = alsEuro(summen.einnahmen);
  el('summe-ausgaben').textContent  = alsEuro(summen.ausgaben);
  el('summe-sparen').textContent    = alsEuro(summen.sparen);

  // "Übrig" rot färben, wenn mehr rausging als reinkam
  el('summe-uebrig').classList.toggle('minus', summen.uebrig < 0);

  // Hinweis nur zeigen, wenn der Monat leer ist
  el('hinweis-leer').hidden = anzahl > 0;
}

// ==========================================================
// Bereich "Buchungen"
// ==========================================================

// Füllt die Auswahlliste für den Kategorie-Filter
function fuelleFilter() {
  const auswahl = el('filter-kategorie');
  auswahl.innerHTML = '';
  auswahl.add(new Option('Alle Kategorien', ''));

  const gruppen = { ausgabe: 'Ausgaben', einnahme: 'Einnahmen', sparen: 'Sparen' };
  for (const typ of Object.keys(gruppen)) {
    const gruppe = document.createElement('optgroup');
    gruppe.label = gruppen[typ];
    for (const k of kategorienVomTyp(daten, typ)) {
      gruppe.appendChild(new Option(k.name, k.id));
    }
    auswahl.appendChild(gruppe);
  }
  auswahl.value = zustand.filterKategorie;
}

// Zeichnet die Liste der Buchungen des gewählten Monats
function zeigeBuchungsliste() {
  const liste = el('buchungsliste');
  liste.innerHTML = '';

  const imMonat = buchungenImMonat(daten, zustand.jahr, zustand.monat);
  let buchungen = imMonat;
  if (zustand.filterKategorie) {
    buchungen = buchungen.filter(b => b.kategorieId === zustand.filterKategorie);
  }

  // Neueste zuerst: nach Datum, bei gleichem Datum die zuletzt eingetragene oben
  buchungen.sort((a, b) => b.datum.localeCompare(a.datum) || b.geaendertAm.localeCompare(a.geaendertAm));

  // Hinweis, wenn nichts zu zeigen ist
  const leer = el('liste-leer');
  leer.hidden = buchungen.length > 0;
  leer.textContent = imMonat.length === 0
    ? 'Noch keine Buchungen in diesem Monat. Tippe unten rechts auf „+“.'
    : 'Keine Buchungen in dieser Kategorie.';

  // Bei aktivem Filter: Summe der gefilterten Buchungen anzeigen
  if (zustand.filterKategorie && buchungen.length > 0) {
    const summe = buchungen.reduce((s, b) => s + b.betragCent, 0);
    const zeile = document.createElement('p');
    zeile.className = 'filter-summe';
    zeile.textContent = buchungen.length + (buchungen.length === 1 ? ' Buchung' : ' Buchungen') + ' · zusammen ' + alsEuro(summe);
    liste.appendChild(zeile);
  }

  // Buchungen nach Tagen gruppieren: für jeden neuen Tag eine Überschrift
  let letztesDatum = null;
  let gruppe = null;
  for (const b of buchungen) {
    if (b.datum !== letztesDatum) {
      const ueberschrift = document.createElement('h3');
      ueberschrift.className = 'tag-ueberschrift';
      ueberschrift.textContent = datumAlsUeberschrift(b.datum);
      liste.appendChild(ueberschrift);

      gruppe = document.createElement('div');
      gruppe.className = 'karte buchungsgruppe';
      liste.appendChild(gruppe);
      letztesDatum = b.datum;
    }
    gruppe.appendChild(buchungsZeile(b));
  }
}

// Baut eine einzelne Zeile der Liste. Antippen öffnet das Formular zum Bearbeiten.
function buchungsZeile(b) {
  const zeile = document.createElement('button');
  zeile.type = 'button';
  zeile.className = 'buchung';
  zeile.addEventListener('click', () => oeffneFormular(b));

  // Linke Seite: Kategorie (+ Sonder-Markierung) und darunter die Notiz
  const links = document.createElement('span');
  links.className = 'buchung-text';
  const name = document.createElement('span');
  name.textContent = kategorieName(b.kategorieId);
  links.appendChild(name);
  if (b.sonder) {
    const marke = document.createElement('span');
    marke.className = 'marke';
    marke.textContent = 'Sonder';
    name.appendChild(marke);
  }
  if (b.notiz) {
    const notiz = document.createElement('small');
    notiz.textContent = b.notiz;   // textContent: die Notiz wird als reiner Text gezeigt, nie als Code
    links.appendChild(notiz);
  }

  // Rechte Seite: Betrag mit Vorzeichen und Farbe
  const betrag = document.createElement('span');
  betrag.className = 'buchung-betrag';
  if (b.typ === 'einnahme') { betrag.textContent = '+' + alsEuro(b.betragCent); betrag.classList.add('plus'); }
  if (b.typ === 'ausgabe')  { betrag.textContent = '−' + alsEuro(b.betragCent); betrag.classList.add('minus'); }
  if (b.typ === 'sparen')   { betrag.textContent = alsEuro(b.betragCent);        betrag.classList.add('gespart'); }

  zeile.append(links, betrag);
  return zeile;
}

// ==========================================================
// Formular: Buchung anlegen, bearbeiten, löschen
// ==========================================================

// Welcher Typ ist im Formular gerade gewählt?
function gewaehlterTyp() {
  return document.querySelector('input[name="typ"]:checked').value;
}

// Füllt die Kategorie-Auswahl passend zum Typ.
// Die bisher gewählte Kategorie bleibt stehen, wenn sie zum Typ passt.
function fuelleKategorieAuswahl(gewuenschteId) {
  const auswahl = el('eingabe-kategorie');
  auswahl.innerHTML = '';
  for (const k of kategorienVomTyp(daten, gewaehlterTyp())) {
    auswahl.add(new Option(k.name, k.id));
  }
  if (gewuenschteId && [...auswahl.options].some(o => o.value === gewuenschteId)) {
    auswahl.value = gewuenschteId;
  }
}

// Öffnet das Formular. Ohne Buchung: neue Buchung. Mit Buchung: bearbeiten.
function oeffneFormular(buchung) {
  zustand.bearbeiteId = buchung ? buchung.id : null;
  el('formular-titel').textContent = buchung ? 'Buchung bearbeiten' : 'Neue Buchung';
  el('knopf-loeschen').hidden = !buchung;
  el('fehler-betrag').hidden = true;

  // Vorschlag fürs Datum: heute – oder der 1., wenn gerade ein anderer Monat angezeigt wird
  let vorschlagDatum = datumAlsText(heute);
  if (!vorschlagDatum.startsWith(monatsSchluessel(zustand.jahr, zustand.monat))) {
    vorschlagDatum = monatsSchluessel(zustand.jahr, zustand.monat) + '-01';
  }

  const typ = buchung ? buchung.typ : 'ausgabe';
  document.querySelector('input[name="typ"][value="' + typ + '"]').checked = true;
  fuelleKategorieAuswahl(buchung ? buchung.kategorieId : null);

  el('eingabe-betrag').value  = buchung ? (buchung.betragCent / 100).toLocaleString('de-DE', { minimumFractionDigits: 2 }) : '';
  el('eingabe-datum').value   = buchung ? buchung.datum : vorschlagDatum;
  el('eingabe-notiz').value   = buchung ? buchung.notiz : '';
  el('eingabe-sonder').checked = buchung ? buchung.sonder : false;

  el('buchung-dialog').showModal();
  if (!buchung) el('eingabe-betrag').focus();   // bei neuer Buchung gleich den Betrag eintippen
}

// "Speichern" gedrückt
function speichereFormular(ereignis) {
  ereignis.preventDefault();   // verhindert, dass die Seite neu lädt

  const betragCent = betragZuCent(el('eingabe-betrag').value);
  el('fehler-betrag').hidden = betragCent !== null;
  if (betragCent === null) {
    el('eingabe-betrag').focus();
    return;
  }

  const datum = el('eingabe-datum').value || datumAlsText(heute);

  // Bestehende Buchung: Verknüpfung zur Fixkosten-Vorlage behalten
  const alt = daten.buchungen.find(b => b.id === zustand.bearbeiteId);

  speichereBuchung(daten, {
    id: zustand.bearbeiteId,
    datum: datum,
    betragCent: betragCent,
    typ: gewaehlterTyp(),
    kategorieId: el('eingabe-kategorie').value,
    notiz: el('eingabe-notiz').value.trim(),
    sonder: el('eingabe-sonder').checked,
    fixkostenId: alt ? alt.fixkostenId : null
  });

  // Zum Monat der Buchung springen, damit man sie gleich sieht
  const [j, m] = datum.split('-').map(Number);
  zustand.jahr = j;
  zustand.monat = m;

  el('buchung-dialog').close();
  aktualisiereAnzeige();
}

// "Buchung löschen" gedrückt – mit Sicherheitsabfrage
function loescheAusFormular() {
  const b = daten.buchungen.find(x => x.id === zustand.bearbeiteId);
  if (!b) return;

  const frage = 'Diese Buchung wirklich löschen?\n\n' +
                kategorieName(b.kategorieId) + ' · ' + alsEuro(b.betragCent) + '\n\n' +
                'Das kann nicht rückgängig gemacht werden.';
  if (!confirm(frage)) return;

  loescheBuchung(daten, b.id);
  el('buchung-dialog').close();
  aktualisiereAnzeige();
}

// ==========================================================
// Wechsel zwischen den Bereichen (Leiste unten)
// ==========================================================

// Zeigt den Bereich an, der hinter dem # in der Adresse steht (z. B. "#fixkosten")
function zeigeBereich() {
  const name = location.hash.slice(1) || 'uebersicht';

  for (const bereich of document.querySelectorAll('.bereich')) {
    bereich.hidden = bereich.id !== 'bereich-' + name;
  }
  for (const knopf of document.querySelectorAll('.leiste a')) {
    knopf.classList.toggle('aktiv', knopf.dataset.bereich === name);
  }
  // Der "+"-Knopf erscheint nur in Übersicht und Buchungen
  el('plus-knopf').hidden = !(name === 'uebersicht' || name === 'buchungen');

  aktualisiereAnzeige();
}

// ==========================================================
// Knöpfe verbinden und starten
// ==========================================================

for (const pfeil of document.querySelectorAll('.pfeil')) {
  pfeil.addEventListener('click', () => wechsleMonat(Number(pfeil.dataset.schritt)));
}
el('filter-kategorie').addEventListener('change', (e) => {
  zustand.filterKategorie = e.target.value;
  zeigeBuchungsliste();
});
el('plus-knopf').addEventListener('click', () => oeffneFormular(null));
el('buchung-formular').addEventListener('submit', speichereFormular);
el('knopf-abbrechen').addEventListener('click', () => el('buchung-dialog').close());
el('knopf-loeschen').addEventListener('click', loescheAusFormular);
for (const knopf of document.querySelectorAll('input[name="typ"]')) {
  knopf.addEventListener('change', () => fuelleKategorieAuswahl(el('eingabe-kategorie').value));
}
window.addEventListener('hashchange', zeigeBereich);

fuelleFilter();
zeigeBereich();
