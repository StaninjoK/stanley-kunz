# Analytics & Metricool

## Website-Analytics (getrennt von Social)

Die Seite trackt aktuell **nichts**. Vorbereitet ist **GoatCounter** – kostenlos für persönliche Seiten, Open Source,
keine Cookies, keine personenbezogenen Daten, kein Consent-Banner nötig.

Aktivieren (einmalig, 3 Minuten):
1. Auf https://www.goatcounter.com ein Konto anlegen, Code z. B. `stanleykunz` wählen.
2. In `src/config/site.ts`: `ANALYTICS = { provider: 'goatcounter', goatcounterCode: 'stanleykunz' }`.
3. Push. Die Datenschutzerklärung passt sich automatisch an.

Was du dann siehst:
- Seitenaufrufe pro Story/Video, Herkunft (Google, YouTube, Instagram …), Länder, Geräte.
- **Welche Plattform Besucher bringt:** alle Links aus Social-Posts tragen `utm_source=<plattform>` (siehe `content:social`).
- **Events:** Video-Abspielen (`video-play-<id>`), Klicks zu YouTube und Social (`outbound-*`), Kapitel-Klicks, Teilen.
- **Suchtraffic langfristig:** zusätzlich die Google Search Console verbinden (Verifikation per Meta-Tag:
  `VERIFICATION.google` in `site.ts`) – zeigt Suchbegriffe, Rankings und welche Stories dauerhaft gefunden werden.

## Metricool

**Rolle:** Distribution, Planung und Social-Analytics. Die Website ist **nicht** von Metricool abhängig.

Verbunden (Marke „stankunz14@gmail.com“, Zeitzone America/Buenos_Aires): YouTube, Instagram (`kunz.stanley`), Threads,
Facebook-Seite, Bluesky, Pinterest, Facebook Ads. Noch nicht in Metricool sichtbar: TikTok, X, LinkedIn.

Workflow:
1. Nach einer neuen Story erzeugt `npm run content:social -- <slug>` Texte pro Plattform (mit oder ohne Website-Link, je nach `linkPolicy`).
2. Claude plant die Posts über die Metricool-Verbindung mit **„zur Freigabe“** (`createScheduledPostForReview`) – nichts geht ohne dich raus.
3. Beste Zeiten liefert Metricool (`getBestTimeToPostByNetwork`), Auswertung über Metricool-Analytics.

Optional später: Metricool „SmartLinks“ als Link-in-Bio, mit `/stories/` bzw. dem neuesten Video als Ziel.
