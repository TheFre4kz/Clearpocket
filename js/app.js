/* ==========================================================
   app.js – Start der App, Anzeige und Bedienung
   ========================================================== */

// Versionsnummer der App. Bei jeder neuen Version hochzählen –
// in den Einstellungen siehst du dann, ob das iPhone die neueste hat.
const APP_VERSION = '0.4.0';

// --- Daten laden ---
let daten;
let datenGeladen = true;
try {
  daten = ladeDaten();
} catch (fehler) {
  alert(fehler.message);
  daten = standardDaten();   // nur zum Anzeigen, wird nicht gespeichert
  datenGeladen = false;
}
bitteUmDauerhaftenSpeicher();

// --- Was gerade angezeigt wird ---
const heute = new Date();
const zustand = {
  jahr: heute.getFullYear(),
  monat: heute.getMonth() + 1,   // JavaScript zählt Monate ab 0, wir ab 1
  filterKategorie: '',           // leer = alle Kategorien
  bearbeiteId: null,             // ID der Buchung im Formular, null = neue Buchung
  bearbeiteFixId: null,          // ID der Fixkosten-Vorlage im Formular, null = neue Vorlage
  bereich: 'uebersicht'          // welcher Bereich gerade offen ist
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

// Heutiges Datum als "JJJJ-MM-TT" – jedes Mal frisch, falls die App über Mitternacht offen ist
function heuteText() {
  return datumAlsText(new Date());
}

// Cent als Text fürs Eingabefeld, z. B. 123456 → "1.234,56"
function centAlsEingabe(cent) {
  return (cent / 100).toLocaleString('de-DE', { minimumFractionDigits: 2 });
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
  zeigeFixkosten();
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
  if (b.fixkostenId) {
    const marke = document.createElement('span');
    marke.className = 'marke marke-leise';
    marke.textContent = 'Fix';
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

// Welcher Typ ist gerade gewählt? radioName: "typ" (Buchung) oder "fix-typ" (Fixkosten)
function gewaehlterTyp(radioName) {
  return document.querySelector('input[name="' + radioName + '"]:checked').value;
}

// Füllt eine Kategorie-Auswahl passend zum Typ.
// Die bisher gewählte Kategorie bleibt stehen, wenn sie zum Typ passt.
function fuelleKategorieAuswahl(auswahl, typ, gewuenschteId) {
  auswahl.innerHTML = '';
  for (const k of kategorienVomTyp(daten, typ)) {
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
  let vorschlagDatum = heuteText();
  if (!vorschlagDatum.startsWith(monatsSchluessel(zustand.jahr, zustand.monat))) {
    vorschlagDatum = monatsSchluessel(zustand.jahr, zustand.monat) + '-01';
  }

  const typ = buchung ? buchung.typ : 'ausgabe';
  document.querySelector('input[name="typ"][value="' + typ + '"]').checked = true;
  fuelleKategorieAuswahl(el('eingabe-kategorie'), typ, buchung ? buchung.kategorieId : null);

  el('eingabe-betrag').value  = buchung ? centAlsEingabe(buchung.betragCent) : '';
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

  const datum = el('eingabe-datum').value || heuteText();

  // Bestehende Buchung: Verknüpfung zur Fixkosten-Vorlage behalten
  const alt = daten.buchungen.find(b => b.id === zustand.bearbeiteId);

  speichereBuchung(daten, {
    id: zustand.bearbeiteId,
    datum: datum,
    betragCent: betragCent,
    typ: gewaehlterTyp('typ'),
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
// Bereich "Fixkosten"
// ==========================================================

// Zeichnet die Zusammenfassung und die Liste der Vorlagen
function zeigeFixkosten() {
  // Summen pro Monat – nur aktive Vorlagen zählen
  const summe = { einnahme: 0, ausgabe: 0, sparen: 0 };
  for (const f of daten.fixkosten) {
    if (f.aktiv) summe[f.typ] += proMonatCent(f);
  }
  el('fix-einnahmen').textContent = alsEuro(summe.einnahme);
  el('fix-ausgaben').textContent  = alsEuro(summe.ausgabe);
  el('fix-sparen').textContent    = alsEuro(summe.sparen);

  const liste = el('fixkostenliste');
  liste.innerHTML = '';
  el('fix-leer').hidden = daten.fixkosten.length > 0;

  // Nach Typ gruppiert, innerhalb einer Gruppe der größte Betrag zuerst
  const gruppen = { einnahme: 'Einnahmen', ausgabe: 'Ausgaben', sparen: 'Sparen' };
  for (const typ of Object.keys(gruppen)) {
    const vorlagen = daten.fixkosten
      .filter(f => f.typ === typ)
      .sort((a, b) => proMonatCent(b) - proMonatCent(a));
    if (vorlagen.length === 0) continue;

    const ueberschrift = document.createElement('h3');
    ueberschrift.className = 'tag-ueberschrift';
    ueberschrift.textContent = gruppen[typ];
    liste.appendChild(ueberschrift);

    const gruppe = document.createElement('div');
    gruppe.className = 'karte buchungsgruppe';
    for (const f of vorlagen) gruppe.appendChild(fixkostenZeile(f));
    liste.appendChild(gruppe);
  }
}

// Eine Zeile der Fixkosten-Liste. Antippen öffnet das Formular.
function fixkostenZeile(f) {
  const zeile = document.createElement('button');
  zeile.type = 'button';
  zeile.className = 'buchung' + (f.aktiv ? '' : ' pausiert');
  zeile.addEventListener('click', () => oeffneFixFormular(f));

  const links = document.createElement('span');
  links.className = 'buchung-text';
  const name = document.createElement('span');
  name.textContent = f.name;
  if (!f.aktiv) {
    const marke = document.createElement('span');
    marke.className = 'marke marke-leise';
    marke.textContent = 'pausiert';
    name.appendChild(marke);
  }
  const details = document.createElement('small');
  details.textContent = kategorieName(f.kategorieId) + ' · ' + RHYTHMUS_NAMEN[f.rhythmus] + ' am ' + f.faelligAm + '.';
  links.append(name, details);

  const betrag = document.createElement('span');
  betrag.className = 'buchung-betrag ' + { einnahme: 'plus', ausgabe: 'minus', sparen: 'gespart' }[f.typ];
  betrag.textContent = alsEuro(f.betragCent);

  zeile.append(links, betrag);
  return zeile;
}

// Öffnet das Fixkosten-Formular. Ohne Vorlage: neu. Mit Vorlage: bearbeiten.
function oeffneFixFormular(f) {
  zustand.bearbeiteFixId = f ? f.id : null;
  el('fix-titel').textContent = f ? 'Fixkosten bearbeiten' : 'Neue Fixkosten';
  el('fix-loeschen').hidden = !f;
  for (const id of ['fix-fehler-name', 'fix-fehler-betrag', 'fix-fehler-tag', 'fix-fehler-monat']) {
    el(id).hidden = true;
  }

  const typ = f ? f.typ : 'ausgabe';
  document.querySelector('input[name="fix-typ"][value="' + typ + '"]').checked = true;
  fuelleKategorieAuswahl(el('fix-kategorie'), typ, f ? f.kategorieId : null);

  el('fix-name').value      = f ? f.name : '';
  el('fix-betrag').value    = f ? centAlsEingabe(f.betragCent) : '';
  el('fix-rhythmus').value  = f ? f.rhythmus : 'monatlich';
  el('fix-tag').value       = f ? f.faelligAm : 1;
  el('fix-start').value     = f ? f.startMonat : heuteText().slice(0, 7);
  el('fix-ende').value      = f && f.endMonat ? f.endMonat : '';
  el('fix-aktiv').checked   = f ? f.aktiv : true;

  el('fix-dialog').showModal();
  if (!f) el('fix-name').focus();
}

// "Speichern" im Fixkosten-Formular
function speichereFixFormular(ereignis) {
  ereignis.preventDefault();

  // Alle Eingaben prüfen und Fehler anzeigen
  const name = el('fix-name').value.trim();
  const betragCent = betragZuCent(el('fix-betrag').value);
  const tag = Number(el('fix-tag').value);
  const start = el('fix-start').value || heuteText().slice(0, 7);
  const ende = el('fix-ende').value || null;

  const fehler = {
    'fix-fehler-name': name === '',
    'fix-fehler-betrag': betragCent === null,
    'fix-fehler-tag': !Number.isInteger(tag) || tag < 1 || tag > 31,
    'fix-fehler-monat': ende !== null && ende < start
  };
  for (const id of Object.keys(fehler)) el(id).hidden = !fehler[id];
  if (Object.values(fehler).some(Boolean)) return;

  speichereFixkosten(daten, {
    id: zustand.bearbeiteFixId,
    name: name,
    betragCent: betragCent,
    typ: gewaehlterTyp('fix-typ'),
    kategorieId: el('fix-kategorie').value,
    rhythmus: el('fix-rhythmus').value,
    faelligAm: tag,
    startMonat: start,
    endMonat: ende,
    aktiv: el('fix-aktiv').checked
  });

  // Gleich buchen, was schon fällig ist (z. B. wenn der Startmonat in der Vergangenheit liegt)
  const neu = fixkostenBuchen(daten, heuteText());
  el('fix-dialog').close();
  aktualisiereAnzeige();
  if (neu > 1) {
    alert(neu + ' Buchungen wurden automatisch nachgetragen.');
  }
}

// "Vorlage löschen" – mit Sicherheitsabfrage
function loescheFixAusFormular() {
  const f = daten.fixkosten.find(x => x.id === zustand.bearbeiteFixId);
  if (!f) return;

  const frage = 'Die Vorlage „' + f.name + '“ wirklich löschen?\n\n' +
                'Ab jetzt wird nichts mehr automatisch gebucht. ' +
                'Bereits gebuchte Einträge bleiben erhalten.\n\n' +
                'Tipp: Du kannst sie stattdessen auch nur pausieren.';
  if (!confirm(frage)) return;

  loescheFixkosten(daten, f.id);
  el('fix-dialog').close();
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
  // Der "+"-Knopf: in den Einstellungen gibt es nichts hinzuzufügen
  zustand.bereich = name;
  el('plus-knopf').hidden = name === 'einstellungen';
  el('plus-knopf').setAttribute('aria-label', name === 'fixkosten' ? 'Neue Fixkosten' : 'Neue Buchung');

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
// Der "+"-Knopf öffnet je nach Bereich das passende Formular
el('plus-knopf').addEventListener('click', () => {
  if (zustand.bereich === 'fixkosten') oeffneFixFormular(null);
  else oeffneFormular(null);
});

// Buchungs-Formular
el('buchung-formular').addEventListener('submit', speichereFormular);
el('knopf-abbrechen').addEventListener('click', () => el('buchung-dialog').close());
el('knopf-loeschen').addEventListener('click', loescheAusFormular);
for (const knopf of document.querySelectorAll('input[name="typ"]')) {
  knopf.addEventListener('change', () =>
    fuelleKategorieAuswahl(el('eingabe-kategorie'), gewaehlterTyp('typ'), el('eingabe-kategorie').value));
}

// Fixkosten-Formular
el('fix-formular').addEventListener('submit', speichereFixFormular);
el('fix-abbrechen').addEventListener('click', () => el('fix-dialog').close());
el('fix-loeschen').addEventListener('click', loescheFixAusFormular);
for (const knopf of document.querySelectorAll('input[name="fix-typ"]')) {
  knopf.addEventListener('change', () =>
    fuelleKategorieAuswahl(el('fix-kategorie'), gewaehlterTyp('fix-typ'), el('fix-kategorie').value));
}
window.addEventListener('hashchange', zeigeBereich);

// ==========================================================
// Updates: immer die neueste Version laden
// ==========================================================

// Den Service Worker anmelden (Datei service-worker.js, erklärt dort)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js');
}

// Das iPhone lässt Home-Bildschirm-Apps oft im Hintergrund "schlafen"
// und weckt sie später einfach wieder auf – ohne neu zu laden.
// Darum: War die App länger als 5 Minuten weg, laden wir sie neu
// und holen so eine eventuell neue Version. Deine Daten bleiben dabei erhalten.
const NEU_LADEN_NACH_MS = 5 * 60 * 1000;
let verstecktSeit = null;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    verstecktSeit = Date.now();
  } else if (verstecktSeit && Date.now() - verstecktSeit > NEU_LADEN_NACH_MS &&
             !el('buchung-dialog').open && !el('fix-dialog').open) {
    location.reload();   // nicht, wenn gerade ein Formular offen ist
  }
});

el('app-version').textContent = APP_VERSION;

// Beim Start: fällige Fixkosten automatisch buchen
// (nur wenn die Daten sauber geladen wurden – sonst würden wir nichts speichern wollen)
if (datenGeladen) {
  fixkostenBuchen(daten, heuteText());
}
fuelleFilter();
zeigeBereich();
