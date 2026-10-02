# Architektur

## Warum so

| Entscheidung | Begründung |
|---|---|
| **Astro, statisch** | Schnell (kein JS-Framework im Browser), SEO-freundlich, robust. Jede Seite ist fertiges HTML auf einem CDN. Content Collections geben Schemas, Typen und Bildoptimierung ohne Datenbank. |
| **Git als CMS** (MDX/YAML) | Versioniert, automatisierbar (ein Agent schreibt Dateien, kein API-Zugang nötig), reviewbar, kein Server, kein Login, keine Kosten. Skaliert problemlos auf Hunderte Stories/Videos. |
| **GitHub Pages** | Gleiches Setup wie kunzglobal.com, kostenlos, HTTPS, CDN. Ein zusätzlicher DNS-Eintrag, keine Änderung an bestehenden Diensten. |
| **Kein Headless-CMS** | Für eine Person mit Agent-Workflow wäre ein CMS zusätzliche Infrastruktur ohne Mehrwert. Statt Admin-Panel: Content-Desk (`npm run desk`) + GitHub. |
| **Inbox außerhalb des Repos** | Das Repository ist öffentlich (GitHub Pages im Free-Plan). Entwürfe und Freigabe-Kandidaten liegen deshalb in `content-inbox/` (git-ignoriert) und gelangen erst nach bestandenen Gates ins Repo. |

Die bestehende kunzglobal.com (Vite + React-Prerender, Repo `StaninjoK/KunzGlobal`) bleibt unverändert. Wiederverwendet wurden
nur Gestaltungsprinzipien (Tokens, Motion, Reduced Motion, „ohne JS alles sichtbar“) und freigegebene Fotos.

## Datenmodell (`src/content.config.ts`)

- **stories** – lange, eigenständige Artikel. Pflicht: Titel, Beschreibung, Dek, Datum, Risiko, Themen, Hero mit Alt-Text, Herkunft.
  Optional: Video, Projekte, „Kurz gesagt“, „Auf einen Blick“, FAQ, Quellen, Keywords, Social-Link-Strategie, Übersetzungsschlüssel.
- **videos** – YouTube-Videos mit Kapiteln. `youtubeId` und `status: published` setzt der Sync automatisch.
- **moments** – kurze Beobachtungen (Bild, Loop oder nur Text), verknüpft mit Video-Zeitstempel/Story.
- **projects** – persönliche Sicht auf Unternehmen/Projekte, Link zur offiziellen Seite.
- **journey** – Timeline (YAML), ehrliche Datumsbeschriftung („Mit 12“, „ca.“).
- **pages** – wachsende Einzelseiten (Über mich).

Beziehungen: Story → Video (`video`), Story → Projekte, Moment → Video/Story. Rückwärts (Video → Story, „Weiterlesen“) wird beim Build berechnet.

## Seiten

`/` · `/videos/` · `/videos/<slug>/` · `/stories/` · `/stories/<slug>/` · `/momente/` · `/projekte/` · `/ueber-mich/` · `/weg/` ·
`/themen/` · `/themen/<thema>/` · `/impressum/` · `/datenschutz/` · `/rss.xml` · `/sitemap-index.xml` · `/robots.txt` · `/llms.txt` · `/og/…jpg`

## „Lebendig“ ohne Ballast

- Neuer Content erscheint automatisch (Build bei Push + alle 6 h). Die „Zuletzt“-Leiste und „Neuestes Video“ ergeben sich aus den Daten.
- Momente werden bei jedem Besuch neu gemischt; „Neu“-Markierungen berechnet der Browser relativ zum heutigen Datum.
- Echte Video-Loops (stumm, 2–4 s, < 800 KB) laden erst sichtbar, nie bei Reduced Motion oder Datensparmodus.
- Scroll-Tiefe im Hero über native CSS Scroll-Timelines (kein JS), Reveals über einen IntersectionObserver.
- Gesamtes JavaScript ≈ 5 KB; kein Framework im Browser.

## SEO / AEO

Semantisches HTML, eine H1 pro Seite, Breadcrumbs, Canonical, Open Graph, Twitter Cards, `hreflang`-fähig, XML-Sitemap (ohne noindex-Seiten),
RSS, robots.txt, `llms.txt`. JSON-LD: `Person`, `WebSite`, `BlogPosting` (mit Autor, Daten, Wortanzahl, Video-Verweis), `VideoObject`
mit Kapiteln als `Clip` (sobald öffentlich), `BreadcrumbList`, `FAQPage`, `ProfilePage`. Dünne Themenseiten (< 2 Beiträge) sind `noindex`.
Stories enthalten „Kurz gesagt“, „Auf einen Blick“ und ein Herkunfts-Hinweis – gut zitierbar für Menschen und Antwortmaschinen.

## Mehrsprachigkeit

Deutsch an der Wurzel. `src/config/i18n.ts` und `astro.config.mjs` sind für `/en/`, `/es/`, `/pt/` vorbereitet; Inhalte tragen `lang`
und `translationKey`. Übersetzungen werden als geprüfte Einträge angelegt – keine automatische Massenübersetzung.

## Performance

AVIF/WebP mit `srcset`/`sizes`, Lazy Loading, `fetchpriority` fürs LCP-Bild, selbst gehostete Variable Fonts (Subset, Preload,
metrisch angepasste Fallbacks), Inline-CSS, YouTube-Fassade. Lighthouse (lokal, simuliertes Mobilnetz): Accessibility, Best Practices
und SEO jeweils 100; Performance Desktop 99–100, Mobil ~88–97.
