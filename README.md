# stanley.kunzglobal.com

Persönlicher Media-Hub von **Stanley Kunz** – kein Blog, sondern das langfristige Archiv seiner Geschichte:
mit 19 von Deutschland nach Uruguay, Leben auf dem Land, Agrardrohnen, Unternehmen, Fehler und Rückschläge.
YouTube und Social Media verteilen, diese Seite bewahrt auf.

> Ein reales Erlebnis → viele Content-Assets → langfristig auffindbare eigene Inhalte.

## Auf einen Blick

| | |
|---|---|
| Stack | Astro 7 (statisch), TypeScript, Content Collections (MDX/YAML im Git), kein Framework-JS im Browser |
| Hosting | GitHub Pages (wie kunzglobal.com), eigene Subdomain `stanley.kunzglobal.com` |
| Deploy | GitHub Actions bei jedem Push + alle 6 h (YouTube-Sync & geplante Stories) |
| Inhalte | `src/content/` (veröffentlicht) · `content-inbox/` (Entwürfe, git-ignoriert, nie online) |
| Bilder | eigenes Material, AVIF/WebP/JPEG responsive beim Build, OG-Bilder automatisch |
| Video | YouTube-Fassade: YouTube lädt erst nach Klick (youtube-nocookie) |
| Tracking | keins – vorbereitet für GoatCounter (cookielos), ein Eintrag in `src/config/site.ts` |

## Befehle

```bash
npm install
npm run dev            # http://localhost:4321
npm run build          # statische Seite in dist/
npm run preview        # dist/ ansehen
npm run verify         # Typen, Lint, Unit-Tests, Privacy-Scan, Build, Build-Tests (vor jedem Push)
npm run test:e2e       # Playwright: alle Seiten, Desktop + Mobil, Barrierefreiheit (axe)
npm run desk           # Content-Desk: desk/index.html (Entwürfe, Freigaben, Videos, Status)
```

Content-Pipeline (Details: [`pipeline/AGENT.md`](pipeline/AGENT.md), Anleitung für Stanley: [`docs/CONTENT-SYSTEM.md`](docs/CONTENT-SYSTEM.md)):

```bash
npm run content:ingest -- "<Video-Ordner>" --video <datei.mp4>   # Transkript, Frames, Vorbewertung, Arbeitsauftrag
npm run content:verify -- <story.mdx> <transkript.md>             # Zahlen & Zitate gegen das Transkript prüfen
npm run content:links -- <story.mdx>                              # interne Links vorschlagen
npm run content:promote -- <slug> --transcript <transkript.md>    # Gates prüfen und veröffentlichen
npm run content:social -- <slug>                                  # Social-Texte für Metricool
npm run sync:youtube                                              # YouTube-Feed abgleichen (läuft auch automatisch)
npm run privacy                                                   # Datenschutz-/Secrets-Scan
```

## Struktur

```
src/
  config/        site.ts (Person, Kanäle, Analytics) · taxonomy.ts (feste Themen) · i18n.ts
  content/       stories/ videos/ moments/ projects/ timeline/ pages/   ← Inhalte (Git = CMS)
  content.config.ts  Schemas – erzwingen Pflichtfelder, Taxonomie und Risiko-Regeln
  components/    Karten, Video-Fassade, Loops, Story-Bausteine (Figure, Pullquote, Aside)
  pages/         Routen, OG-Bilder (og/), rss.xml, robots.txt, llms.txt
  scripts/       das einzige Browser-Script (~5 KB): Navigation, Reveals, Loops, Filter, Teilen
scripts/         Node-Werkzeuge: YouTube-Sync, Content-Pipeline, Desk, Privacy-Scan
pipeline/        AGENT.md (Arbeitsanweisung), VOICE.md (Stanleys Stimme), Vorlagen
tests/           unit/ (Werkzeuge) · site.test.mjs (Build) · e2e/ (Playwright + axe)
docs/            Architektur, Content-System, Deployment, Analytics & Metricool
```

## Regeln, die der Code durchsetzt

- Nur feste Themen (`taxonomy.ts`) – keine wuchernde Tag-Sammlung.
- `risk: high` ohne `reviewedBy` → Build schlägt fehl. `risk: medium` aus Videos nur mit geprüftem Transkript.
- Privacy-Scan blockiert Kontaktdaten, Schlüssel, Kennnummern, GPS (auch in Bild-Metadaten) und Namen aus der privaten Denylist.
- Entwürfe liegen nur in `content-inbox/` (nicht im Repository) – der Build-Test prüft, dass nichts davon ausgeliefert wird.
- Nicht angekündigte Videos erscheinen erst, wenn sie auf YouTube öffentlich sind (automatischer Sync).
- Unverifizierte Social-Handles werden nicht verlinkt (`verified: false` in `site.ts`).

Mehr: [Architektur](docs/ARCHITECTURE.md) · [Deployment & DNS](docs/DEPLOYMENT.md) · [Analytics & Metricool](docs/ANALYTICS-METRICOOL.md)
