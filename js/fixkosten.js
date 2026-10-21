/* ==========================================================
   fixkosten.js – Vorlagen für regelmäßige Buchungen
   ----------------------------------------------------------
   Eine Fixkosten-Vorlage sieht so aus:
   {
     id, name, betragCent, typ ("ausgabe" | "einnahme" | "sparen"), kategorieId,
     rhythmus   – "monatlich" | "vierteljaehrlich" | "halbjaehrlich" | "jaehrlich"
     faelligAm  – Tag im Monat (1–31). Hat ein Monat weniger Tage, gilt der letzte Tag.
     startMonat – "JJJJ-MM", erster Monat, in dem gebucht wird
     endMonat   – "JJJJ-MM" oder null (= läuft unbegrenzt)
     aktiv      – false = pausiert, es wird nichts gebucht
     gebuchtBis – "JJJJ-MM", bis zu diesem Monat ist alles erledigt
     geaendertAm
   }

   Warum "gebuchtBis"? Damit eine automatisch gebuchte Miete, die du
   von Hand löschst, nicht beim nächsten Start wieder auftaucht.
   ========================================================== */

// Alle wie viele Monate eine Vorlage fällig ist
const RHYTHMUS_MONATE = {
  monatlich: 1,
  vierteljaehrlich: 3,
  halbjaehrlich: 6,
  jaehrlich: 12
};

// Lesbare Namen für die Anzeige
const RHYTHMUS_NAMEN = {
  monatlich: 'monatlich',
  vierteljaehrlich: 'vierteljährlich',
  halbjaehrlich: 'halbjährlich',
  jaehrlich: 'jährlich'
};

// Nächster Monat als Text: "2026-12" → "2027-01"
function naechsterMonat(monatText) {
  let [j, m] = monatText.split('-').map(Number);
  m += 1;
  if (m > 12) { m = 1; j += 1; }
  return monatsSchluessel(j, m);
}

// Wie viele Monate liegen zwischen zwei Monaten? ("2026-01", "2026-04") → 3
function monateZwischen(von, bis) {
  const [j1, m1] = von.split('-').map(Number);
  const [j2, m2] = bis.split('-').map(Number);
  return (j2 - j1) * 12 + (m2 - m1);
}

// Das Fälligkeitsdatum einer Vorlage in einem Monat.
// Tag 31 im Februar wird zum 28. (bzw. 29. im Schaltjahr).
function faelligkeitsDatum(vorlage, monatText) {
  const [j, m] = monatText.split('-').map(Number);
  const letzterTag = new Date(j, m, 0).getDate();   // Tag 0 des Folgemonats = letzter Tag dieses Monats
  const tag = Math.min(vorlage.faelligAm, letzterTag);
  return monatText + '-' + String(tag).padStart(2, '0');
}

// Ist die Vorlage in diesem Monat laut Rhythmus dran?
function istFaelligImMonat(vorlage, monatText) {
  const abstand = monateZwischen(vorlage.startMonat, monatText);
  return abstand >= 0 && abstand % RHYTHMUS_MONATE[vorlage.rhythmus] === 0;
}

// Rechnet einen Betrag auf einen Monat um: 120 € jährlich → 10 € im Monat
function proMonatCent(vorlage) {
  return Math.round(vorlage.betragCent / RHYTHMUS_MONATE[vorlage.rhythmus]);
}

// Bucht alle fälligen Fixkosten bis einschließlich heute.
// heuteText: "JJJJ-MM-TT". Gibt die Anzahl neuer Buchungen zurück.
function fixkostenBuchen(daten, heuteText) {
  const heuteMonat = heuteText.slice(0, 7);
  let neu = 0;

  for (const vorlage of daten.fixkosten) {
    // Auch pausierte Vorlagen gehen die Monate durch, buchen aber nichts.
    // So wird beim Fortsetzen nicht die ganze Pause nachgebucht.

    // Ab dem Monat nach "gebuchtBis" weitermachen (oder ab dem Startmonat)
    let monat = vorlage.gebuchtBis ? naechsterMonat(vorlage.gebuchtBis) : vorlage.startMonat;
    if (monat < vorlage.startMonat) monat = vorlage.startMonat;

    while (monat <= heuteMonat) {
      if (vorlage.endMonat && monat > vorlage.endMonat) break;

      const datum = faelligkeitsDatum(vorlage, monat);
      if (datum > heuteText) break;   // dieser Termin liegt noch in der Zukunft

      // Sicherheitsnetz: nie doppelt buchen
      const schonDa = daten.buchungen.some(b => b.fixkostenId === vorlage.id && b.datum.startsWith(monat));

      if (vorlage.aktiv && istFaelligImMonat(vorlage, monat) && !schonDa) {
        daten.buchungen.push({
          id: neueId(),
          datum: datum,
          betragCent: vorlage.betragCent,
          typ: vorlage.typ,
          kategorieId: vorlage.kategorieId,
          notiz: vorlage.name,
          sonder: false,
          fixkostenId: vorlage.id,
          geaendertAm: jetzt()
        });
        neu += 1;
      }
      vorlage.gebuchtBis = monat;
      monat = naechsterMonat(monat);
    }
  }

  speichereDaten(daten);   // auch ohne neue Buchung: "gebuchtBis" kann sich geändert haben
  return neu;
}

// Speichert eine Vorlage: neu anlegen (ohne id) oder ändern (mit id)
function speichereFixkosten(daten, eingabe) {
  const alt = daten.fixkosten.find(f => f.id === eingabe.id);

  const vorlage = {
    id: eingabe.id || neueId(),
    name: eingabe.name,
    betragCent: eingabe.betragCent,
    typ: eingabe.typ,
    kategorieId: eingabe.kategorieId,
    rhythmus: eingabe.rhythmus,
    faelligAm: eingabe.faelligAm,
    startMonat: eingabe.startMonat,
    endMonat: eingabe.endMonat || null,
    aktiv: eingabe.aktiv,
    // Wird der Startmonat geändert, rechnen wir neu – doppelte Buchungen verhindert das Sicherheitsnetz
    gebuchtBis: alt && alt.startMonat === eingabe.startMonat ? alt.gebuchtBis : null,
    geaendertAm: jetzt()
  };

  if (alt) {
    daten.fixkosten[daten.fixkosten.indexOf(alt)] = vorlage;
  } else {
    daten.fixkosten.push(vorlage);
  }
  speichereDaten(daten);
  return vorlage;
}

// Löscht eine Vorlage. Bereits gebuchte Einträge bleiben stehen.
function loescheFixkosten(daten, id) {
  daten.fixkosten = daten.fixkosten.filter(f => f.id !== id);
  speichereDaten(daten);
}
