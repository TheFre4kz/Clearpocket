/* ==========================================================
   app.js – Start der App und Wechsel zwischen den Bereichen
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

// --- Welcher Monat wird gerade angezeigt? Zu Beginn der aktuelle. ---
const heute = new Date();
const zustand = {
  jahr: heute.getFullYear(),
  monat: heute.getMonth() + 1   // JavaScript zählt Monate ab 0, wir ab 1
};

// Verwandelt Cent in einen Euro-Text, z. B. 123456 → "1.234,56 €"
function alsEuro(cent) {
  return (cent / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

// Name des Monats, z. B. "Oktober 2026"
function monatsName(jahr, monat) {
  return new Date(jahr, monat - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
}

// Einen Monat vor (+1) oder zurück (-1) gehen
function wechsleMonat(schritt) {
  zustand.monat += schritt;
  if (zustand.monat > 12) { zustand.monat = 1;  zustand.jahr += 1; }
  if (zustand.monat < 1)  { zustand.monat = 12; zustand.jahr -= 1; }
  zeigeUebersicht();
}

// Schreibt die Zahlen des gewählten Monats in die Übersicht
function zeigeUebersicht() {
  const summen = monatsSummen(daten, zustand.jahr, zustand.monat);
  const anzahl = buchungenImMonat(daten, zustand.jahr, zustand.monat).length;

  document.getElementById('monat-name').textContent = monatsName(zustand.jahr, zustand.monat);
  document.getElementById('summe-uebrig').textContent    = alsEuro(summen.uebrig);
  document.getElementById('summe-einnahmen').textContent = alsEuro(summen.einnahmen);
  document.getElementById('summe-ausgaben').textContent  = alsEuro(summen.ausgaben);
  document.getElementById('summe-sparen').textContent    = alsEuro(summen.sparen);

  // "Übrig" rot färben, wenn mehr rausging als reinkam
  document.getElementById('summe-uebrig').classList.toggle('minus', summen.uebrig < 0);

  // Hinweis nur zeigen, wenn der Monat leer ist
  document.getElementById('hinweis-leer').hidden = anzahl > 0;
}

// Zeigt den Bereich an, der hinter dem # in der Adresse steht (z. B. "#fixkosten")
function zeigeBereich() {
  const name = location.hash.slice(1) || 'uebersicht';

  for (const bereich of document.querySelectorAll('.bereich')) {
    bereich.hidden = bereich.id !== 'bereich-' + name;
  }
  for (const knopf of document.querySelectorAll('.leiste a')) {
    knopf.classList.toggle('aktiv', knopf.dataset.bereich === name);
  }
  if (name === 'uebersicht') zeigeUebersicht();
}

// --- Knöpfe verbinden ---
document.getElementById('monat-zurueck').addEventListener('click', () => wechsleMonat(-1));
document.getElementById('monat-vor').addEventListener('click', () => wechsleMonat(1));
window.addEventListener('hashchange', zeigeBereich);

// --- Los geht's ---
zeigeBereich();
