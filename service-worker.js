/* ==========================================================
   service-worker.js – Updates und Offline-Betrieb
   ----------------------------------------------------------
   Ein "Service Worker" ist ein kleines Programm, das der Browser
   im Hintergrund zwischen App und Internet schaltet.

   Unsere Regel heißt "Netz zuerst":
   1. Bei jedem Start fragt er GitHub nach der neuesten Version.
      → Neue Versionen kommen also sofort auf dein iPhone.
   2. Ohne Internet nimmt er die zuletzt gespeicherte Kopie.
      → Die App startet auch offline.

   Deine Finanzdaten haben damit nichts zu tun – die liegen im
   localStorage und werden hier weder gelesen noch verschickt.
   ========================================================== */

// Name des Zwischenspeichers. Nur ändern, wenn sich die Regeln hier ändern.
const CACHE_NAME = 'clearpocket-dateien-v1';

// Diese Dateien werden gleich beim ersten Start für offline gespeichert
const APP_DATEIEN = [
  './',
  'index.html',
  'css/style.css',
  'js/speicher.js',
  'js/buchungen.js',
  'js/app.js'
];

// Beim Installieren: alle App-Dateien frisch holen und speichern
self.addEventListener('install', (ereignis) => {
  ereignis.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_DATEIEN.map(datei => new Request(datei, { cache: 'reload' }))))
      .then(() => self.skipWaiting())   // sofort aktiv werden, nicht auf den nächsten Start warten
  );
});

// Beim Aktivieren: alte Zwischenspeicher aufräumen und die offene App übernehmen
self.addEventListener('activate', (ereignis) => {
  ereignis.waitUntil(
    caches.keys()
      .then(namen => Promise.all(namen.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Bei jeder Anfrage der App: erst im Netz fragen, sonst die gespeicherte Kopie
self.addEventListener('fetch', (ereignis) => {
  const anfrage = ereignis.request;

  // Nur normale Abrufe von unserer eigenen Seite behandeln
  if (anfrage.method !== 'GET' || new URL(anfrage.url).origin !== self.location.origin) {
    return;
  }

  ereignis.respondWith(
    // cache: 'no-cache' → beim Server nachfragen, ob es etwas Neueres gibt
    fetch(anfrage.url, { cache: 'no-cache' })
      .then(antwort => {
        // Erfolgreiche Antwort als Offline-Kopie aufheben
        if (antwort.ok) {
          const kopie = antwort.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(anfrage, kopie));
        }
        return antwort;
      })
      .catch(() =>
        // Kein Internet: gespeicherte Kopie nehmen (bei Seitenaufrufen notfalls die Startseite)
        caches.match(anfrage, { ignoreSearch: true })
          .then(kopie => kopie || (anfrage.mode === 'navigate' ? caches.match('index.html') : undefined))
          .then(kopie => kopie || Response.error())
      )
  );
});
