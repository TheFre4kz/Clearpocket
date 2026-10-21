# Projektplan: Finanz-App „Mein Geld" (Web-App / PWA für iPhone)

> **Anweisung an Claude Code:** Lies diese Datei vollständig, bevor du anfängst.
> Sie beschreibt das Projekt, wie wir zusammenarbeiten und in welcher Reihenfolge gebaut wird.
> Arbeite die Etappen **nacheinander** ab und halte dich an die eingebauten **Rückfragen (❓)** –
> dort stoppst du und wartest auf meine Antwort.

---

## 1. Wer ich bin und wie du mit mir arbeitest

- Ich habe **keine Programmiererfahrung** und benutze zum ersten Mal Git.
- Sprich mit mir **auf Deutsch**, einfach und ohne Fachchinesisch. Wenn ein Fachbegriff nötig ist, erkläre ihn in einem Satz.
- Arbeite in **kleinen Schritten**. Nach jedem Schritt sagst du mir kurz:
  1. was du gemacht hast,
  2. wie ich es selbst ausprobieren kann,
  3. was als Nächstes kommt.
- **Frag nach, statt zu raten**, wenn eine Entscheidung mein Geld, meine Daten oder das Aussehen der App betrifft.
- **Lösche oder überschreibe nie** Dateien oder Daten, ohne vorher zu fragen.
- Wenn etwas schiefgeht, erkläre mir die Ursache verständlich und schlage eine Lösung vor.
- Halte den Code **einfach und gut kommentiert** (Kommentare auf Deutsch), damit ich ihn nach und nach verstehe.

---

## 2. Ziel der App

Eine App, mit der ich meine Finanzen komplett im Blick habe:

- **Einnahmen** (regelmäßig + Sondereinnahmen)
- **Ausgaben** nach **Kategorien** (laufend + Sonderausgaben)
- **Fixkosten** (Miete, Versicherungen, Abos …), die automatisch jeden Monat zählen
- **Monatsübersicht:** Was kam rein, was ging raus, **was bleibt übrig?**
- **Monatshistorie** mit Durchschnittswerten und **Einsparpotenzialen**
- **Sparen & Anlegen:** wie viel ich spare und wo mein Geld liegt (Vermögensübersicht)
- **Prognose** für die kommenden Monate

Die App soll sich auf dem **iPhone wie eine echte App** anfühlen (Icon auf dem Home-Bildschirm, Vollbild, offline nutzbar).

---

## 3. Technische Leitplanken

| Thema | Entscheidung | Begründung |
|---|---|---|
| Art der App | **Progressive Web App (PWA)** | Läuft auf dem iPhone ohne App Store, Mac oder Entwickleraccount |
| Technik | **Reines HTML, CSS und JavaScript** – kein Framework, kein Build-Tool | Für Anfänger verständlich, nichts zu installieren |
| Datenspeicherung | **Lokal im Browser** (IndexedDB oder localStorage) | Daten bleiben nur auf meinem Gerät, nichts geht ins Internet |
| Offline | **Service Worker** + `manifest.json` | App startet auch ohne Internet |
| Diagramme | **Chart.js**, als Datei lokal im Projekt (nicht per CDN) | Funktioniert dann auch offline |
| Hosting | **GitHub Pages** (kostenlos) | Einfach, und ich lerne Git dabei |
| Design | **Mobile first**, für iPhone-Bildschirm optimiert, große Tipp-Flächen | Wird fast nur am Handy benutzt |
| Geldbeträge | Intern in **Cent als ganze Zahl** speichern | Vermeidet Rundungsfehler |

**Datenschutz-Regeln (wichtig!):**
- Es kommen **niemals echte Finanzdaten** in das Git-Repository. Das Repository ist öffentlich.
- Backup-Dateien (`*.json` Exporte) stehen in der `.gitignore`.
- Keine externen Dienste, kein Tracking, keine Analytics.

---

## 4. ❓ Rückfragen VOR dem Start

Bevor du irgendetwas programmierst, stelle mir diese Fragen (gern gesammelt, mit Vorschlägen als Auswahl):

1. **Computer:** Arbeite ich auf Mac oder Windows? Ist Git schon installiert? (Falls nicht: führe mich durch die Installation.)
2. **GitHub:** Habe ich schon einen GitHub-Account? Möchte ich GitHub Desktop (mit Oberfläche) oder die Kommandozeile benutzen? *(Empfehlung: GitHub Desktop am Anfang.)*
3. **App-Name:** Wie soll die App heißen? (Vorschlag: „Mein Geld")
4. **Währung:** Euro? Format `1.234,56 €`?
5. **Monatsbeginn:** Startet mein Finanzmonat am **1.** oder am **Tag meines Gehaltseingangs** (z. B. 25.)?
6. **Kategorien:** Schlage mir eine Standardliste vor (siehe unten) und frag, was ich ändern, ergänzen oder streichen möchte.
7. **Design:** Hell, dunkel oder automatisch nach iPhone-Einstellung? Lieblingsfarbe als Akzent?

**Vorschlag Ausgaben-Kategorien:**
Wohnen · Lebensmittel · Essen gehen · Mobilität/Auto · Versicherungen · Abos & Verträge · Gesundheit · Kleidung · Freizeit & Hobbys · Urlaub · Geschenke · Haushalt · Bildung · Sonstiges

**Vorschlag Einnahmen-Kategorien:**
Gehalt · Nebenjob · Rückerstattungen · Geschenke · Zinsen/Dividenden · Sonstiges

---

## 5. Datenmodell (Grundgerüst)

Bitte erkläre mir dieses Modell kurz, bevor du es umsetzt, und schlage Verbesserungen vor.

- **Buchung**
  - `id`, `datum`, `betragCent`, `typ` (`einnahme` | `ausgabe` | `sparen`), `kategorie`, `notiz`
  - `sonder` (ja/nein) → markiert Sondereinnahmen und Sonderausgaben
  - `fixkostenId` (optional) → falls die Buchung aus einer Fixkosten-Vorlage stammt
- **Fixkosten-Vorlage**
  - `id`, `name`, `betragCent`, `kategorie`, `rhythmus` (monatlich | vierteljährlich | jährlich), `faelligAm` (Tag), `aktiv`, `startdatum`, `enddatum` (optional)
  - Gilt auch für **feste Einnahmen** (z. B. Gehalt) über ein Feld `typ`.
- **Konto / Geldort** (ab Etappe 3)
  - `id`, `name` (Girokonto, Tagesgeld, Depot, Bargeld …), `art`, `stand` mit Datum (Verlauf)
- **Anlage / Asset** (ab Etappe 3)
  - `id`, `name` (z. B. „MSCI World ETF"), `anlageklasse`, `kontoId`, optional `isin`, `stueck`, `wertVerlauf` (Datum + Wert in Cent)
  - Sparen-Buchungen bekommen dann ein Feld `anlageId` → so ist klar, in welches Asset das Geld geflossen ist.
- **Einstellungen**
  - Währung, Monatsbeginn, Kategorien, Design

**Wichtig:** „Sparen/Anlegen" ist **keine Ausgabe**. Geld, das aufs Tagesgeld oder ins Depot geht, ist weiterhin mein Vermögen. Es soll in der Übersicht getrennt angezeigt werden:
`Einnahmen − Ausgaben − Sparen = frei verfügbar`

---

## 6. Etappen

Nach **jeder Etappe**:
- ✅ alles mit mir zusammen testen (auch auf dem iPhone),
- 💾 einen Git-Commit mit verständlicher deutscher Nachricht machen und mir erklären, was ein Commit ist bzw. was gespeichert wurde,
- ❓ mich fragen, ob ich etwas ändern möchte, **bevor** die nächste Etappe beginnt.

### Etappe 0 – Einrichtung & Git-Grundlagen
- Projektordner anlegen, Git-Repository initialisieren, `.gitignore` erstellen.
- Eine erste „Hallo Welt"-Seite bauen.
- Mit mir zusammen auf GitHub hochladen und **GitHub Pages** aktivieren.
- Mir zeigen, wie ich die Seite auf dem iPhone öffne und über **Teilen → Zum Home-Bildschirm** installiere.
- **Lernziel Git:** commit, push, Verlauf ansehen. Erkläre jeden Schritt.

### Etappe 1 – Das Fundament
- Buchungen erfassen: Einnahme / Ausgabe / Sparen, Betrag, Datum, Kategorie, Notiz, Sonder-Häkchen.
- Buchungen bearbeiten und löschen (mit Sicherheitsabfrage).
- **Fixkosten-Vorlagen** anlegen; sie erscheinen automatisch im jeweiligen Monat.
- **Monatsübersicht:** Einnahmen, Ausgaben, Sparen, **übrig** – mit Monatswechsel (vor/zurück).
- Liste der Buchungen des Monats, nach Kategorie filterbar.
- **Backup:** Export aller Daten als JSON-Datei und Import (mit Warnung vor dem Überschreiben).
- PWA-Grundlagen: `manifest.json`, App-Icon, Service Worker für Offline-Betrieb.
- ❓ *Frag mich vorher:* Wie soll die Eingabe aussehen – ein großer „+"-Button mit Formular, oder Schnelleingabe?
- ❓ *Frag mich vorher:* Sollen Fixkosten automatisch gebucht werden oder muss ich sie jeden Monat bestätigen?

### Etappe 2 – Rückblick & Einsparpotenzial
- **Monatshistorie:** Liste aller Monate mit Einnahmen, Ausgaben, Sparen, Rest.
- **Durchschnitte:** pro Kategorie (z. B. letzte 3, 6, 12 Monate – wählbar).
- **Sparquote** pro Monat und im Schnitt.
- **Diagramme:** Kreisdiagramm „Wohin geht mein Geld", Balkendiagramm Monatsverlauf.
- **Sankey-Diagramm „Geldfluss"** (Flussdiagramm mit unterschiedlich breiten Bändern): links die Einnahmen-Quellen, in der Mitte „Budget", rechts die Ausgaben-Kategorien, Sparen/Anlagen und „übrig". Die Breite eines Bandes zeigt, wie viel Geld fließt. Wählbar für einen Monat oder einen Zeitraum.
  - Technik: Chart.js kann das nicht von allein; dafür kommt die Erweiterung **chartjs-chart-sankey** dazu, ebenfalls als lokale Datei in `lib/`.
  - Ab Etappe 3: das Sparen-Band teilt sich weiter auf in die einzelnen Anlagen (z. B. Tagesgeld, ETF, Aktie X).
- **Einsparpotenziale:** Hinweise wie „Essen gehen liegt diesen Monat 40 % über deinem Schnitt" oder „Deine Abos kosten zusammen X € im Jahr".
- Optional: **Budget pro Kategorie** mit Fortschrittsbalken.
- ❓ *Frag mich:* Welche Auswertungen sind mir am wichtigsten? Möchte ich Budgets?

### Etappe 3 – Vermögensübersicht & Geldanlage
- **Konten/Geldorte** anlegen (Girokonto, Tagesgeld, Depot, Bargeld, …).
- Kontostände manuell aktualisieren, mit Verlauf.
- **Anlagen (Assets) erfassen** – also *worin* das Geld steckt, nicht nur *wo*:
  - Anlageklassen, z. B. Tagesgeld/Festgeld · ETF/Fonds · Einzelaktien · Anleihen · Krypto · Edelmetalle · Immobilien · Altersvorsorge (Riester, bAV …) · Sonstiges
  - Jede Anlage gehört zu einem Konto/Depot (z. B. „MSCI World ETF" im Depot bei Bank X).
  - Optional pro Anlage: Stückzahl, Kaufkurs, ISIN/Kürzel.
- **Sparen-Buchungen einer Anlage zuordnen:** „200 € → MSCI World ETF". So sehe ich, wie viel Geld in welches Asset geflossen ist – pro Monat, pro Jahr und insgesamt.
- Auch **Entnahmen/Verkäufe** erfassen (Geld fließt aus einer Anlage zurück aufs Girokonto).
- **Eingezahlt vs. aktueller Wert:** Den aktuellen Wert einer Anlage trage ich ab und zu von Hand ein; die App zeigt dann Gewinn/Verlust in € und %. (Keine automatischen Kurse aus dem Internet – siehe Datenschutz-Regeln.)
- **Auswertungen:**
  - Aufteilung des Vermögens nach Anlageklasse (Kreis-/Ringdiagramm)
  - „Wohin ist mein Erspartes geflossen?" – Summe je Anlage über einen Zeitraum
  - **Gesamtvermögen** + Diagramm der Entwicklung über die Zeit
  - Sankey-Diagramm aus Etappe 2 bekommt die Aufteilung auf die einzelnen Anlagen
- Optional: **Sparziele** (z. B. „Notgroschen 5.000 €") mit Fortschritt.
- Optional: **Sparpläne** als Vorlage (wie Fixkosten), z. B. „monatlich 150 € in ETF X" – werden automatisch als Sparen-Buchung angelegt.
- ❓ *Frag mich:* Welche Konten und Anlagen habe ich? Wie genau will ich erfassen – nur Beträge oder auch Stückzahl und Kurs? Möchte ich Sparziele und Sparpläne?
- Hinweis in der App: Die Anzeige ist eine reine Übersicht, keine Anlageberatung.

### Etappe 4 – Prognose
- Hochrechnung für die nächsten **3 / 6 / 12 Monate** auf Basis von Fixkosten und Durchschnittswerten.
- Bekannte zukünftige Sonderausgaben/-einnahmen eintragbar (z. B. Urlaub, Weihnachtsgeld).
- **Was-wäre-wenn-Rechner:** „Wenn ich monatlich X € mehr spare, habe ich in einem Jahr …"
- Optional: Zinseszins-Rechner für Anlagen.
- ❓ *Frag mich:* Wie vorsichtig soll die Prognose rechnen?
- Hinweis in der App: Prognosen sind Schätzungen, keine Finanzberatung.

### Später / Ideen-Parkplatz
- CSV-Import von Kontoauszügen
- Erinnerung an fehlende Einträge
- Suche über alle Buchungen
- Jahresübersicht
- Mehrere Geräte synchronisieren (erst später, Datenschutz vorher besprechen)

---

## 7. Qualität & Tests

- Teste jede Funktion selbst, bevor du sie mir als fertig meldest.
- Prüfe Rechnungen mit einfachen Beispielzahlen und zeige mir das Ergebnis.
- Achte auf: leere Monate, sehr große Beträge, Kommazahlen (`12,50`), Monatswechsel, Schaltjahr.
- Prüfe die Darstellung in iPhone-Größe (ca. 390 px breit).
- Teste, dass die App offline startet.

---

## 8. Ordnerstruktur (Vorschlag)

```
mein-geld/
├── index.html
├── manifest.json
├── service-worker.js
├── css/
│   └── style.css
├── js/
│   ├── app.js          (Start & Navigation)
│   ├── speicher.js     (Daten lesen/schreiben)
│   ├── buchungen.js
│   ├── fixkosten.js
│   ├── auswertung.js
│   └── prognose.js
├── lib/
│   └── chart.umd.min.js
├── icons/
├── .gitignore
├── PROJEKTPLAN.md      (diese Datei)
└── README.md
```

---

## 9. Fortschritt festhalten

Führe am Ende dieser Datei bzw. in der `README.md` eine kurze Liste:
- welche Etappe erledigt ist,
- welche Entscheidungen ich bei den Rückfragen getroffen habe,
- was als Nächstes ansteht.

So können wir jederzeit weitermachen, auch in einer neuen Sitzung.

---

## Start

**Beginne jetzt mit den Rückfragen aus Abschnitt 4.** Programmiere noch nichts, bevor ich geantwortet habe.

---

## 10. Fortschritt & Entscheidungen

### Entscheidungen aus den Rückfragen (21.10.2026)
| Frage | Entscheidung |
|---|---|
| Computer | Windows 11, Git war noch nicht installiert |
| GitHub | Account vorhanden, Arbeit mit **GitHub Desktop** |
| App-Name | **Clearpocket** |
| Währung | Euro, Format `1.234,56 €` |
| Monatsbeginn | Am **1.** des Monats |
| Kategorien | Standardliste aus Abschnitt 4 unverändert übernommen |
| Design | **Automatisch** (hell/dunkel nach iPhone-Einstellung), Akzentfarbe **Violett** |

### Ergänzungen zum Datenmodell (abgestimmt)
1. **Kategorien bekommen eine eigene `id`.** Buchungen und Vorlagen speichern `kategorieId` statt des Namens – Umbenennen ändert so nichts an alten Buchungen.
2. **Jeder Eintrag hat `geaendertAm`** (Zeitpunkt der letzten Änderung) – hilft bei Backups und späterer Synchronisierung.
3. **Die gespeicherten Daten haben eine `datenVersion`.** Ändert sich das Modell, kann die App alte Daten automatisch umbauen.

### Entscheidungen für Etappe 1 (21.10.2026)
| Frage | Entscheidung |
|---|---|
| Eingabe | Runder **„+“-Button** unten rechts, öffnet ein Formular |
| Fixkosten | Werden am Fälligkeitstag **automatisch gebucht**; einzelne Buchungen bleiben änderbar |
| Navigation | **Leiste unten**: Übersicht · Buchungen · Fixkosten · Einstellungen |
| App-Icon | **Weißes C auf Violett** |
| Speicherort | `localStorage` (eine Datei-ähnliche Ablage im Browser) – einfach und reicht für viele tausend Buchungen |
| Sparen-Kategorien | Vorläufig: Notgroschen · Tagesgeld · Depot/ETF · Altersvorsorge · Sonstiges (in Etappe 3 durch Konten ersetzt) |

### Ergänzungen zum Plan (21.10.2026)
- Etappe 2: **Sankey-Diagramm „Geldfluss"** aufgenommen.
- Etappe 3: ausgebaut zu **Vermögensübersicht & Geldanlage** – Anlagen/Assets erfassen, Sparen-Buchungen einer Anlage zuordnen, Gewinn/Verlust, Aufteilung nach Anlageklasse, optional Sparpläne.

**Teilschritte Etappe 1:** 1) Grundgerüst · 2) Buchungen · 3) Fixkosten · 4) Backup · 5) PWA (Icon, Manifest)

**Updates aufs iPhone (seit Version 0.3.0):** Der Service Worker (`service-worker.js`) wurde aus Schritt 5 vorgezogen. Er lädt bei jedem Start zuerst die neueste Version von GitHub („Netz zuerst“) und nutzt ohne Internet die gespeicherte Kopie. War die App länger als 5 Minuten im Hintergrund, lädt sie sich beim Zurückkehren neu.
- **Regel:** Bei jeder neuen Version `APP_VERSION` in `js/app.js` hochzählen. Die Nummer steht in der App unter *Einstellungen*.
- Neue Dateien, die offline verfügbar sein sollen, in `APP_DATEIEN` in `service-worker.js` eintragen.

### Stand
- [x] Rückfragen aus Abschnitt 4 beantwortet
- [x] Datenmodell erklärt und abgestimmt (Abschnitt 5)
- [x] Etappe 0 – Einrichtung & Git-Grundlagen *(Hallo-Welt-Seite live auf GitHub Pages)*
- [ ] Etappe 1 – Das Fundament *(Schritt 1 Grundgerüst und Schritt 2 Buchungen fertig; als Nächstes Schritt 3 Fixkosten)*
- [ ] Etappe 2 – Rückblick & Einsparpotenzial
- [ ] Etappe 3 – Vermögensübersicht
- [ ] Etappe 4 – Prognose

### Wo das Projekt liegt
- Auf dem Rechner: `C:\Users\rehpe\Desktop\Finanzapp\Github\Clearpocket`
- Auf GitHub: https://github.com/TheFre4kz/Clearpocket
- Die App im Internet: https://thefre4kz.github.io/Clearpocket/

### Als Nächstes
Etappe 1 – Das Fundament. Vorher fragen: Wie soll die Eingabe aussehen? Fixkosten automatisch buchen oder jeden Monat bestätigen?
