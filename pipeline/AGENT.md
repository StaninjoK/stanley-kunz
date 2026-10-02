# Content-Agent – Arbeitsanweisung für stanley.kunzglobal.com

Diese Datei ist die verbindliche Anleitung für jeden (KI-)Agenten, der aus Stanleys Videos Inhalte für die Website
erstellt. Sie gilt zusammen mit `VOICE.md` (Stimme) und den Skripten unter `scripts/content/`.

**Grundsatz:** Ein reales Erlebnis → viele Content-Assets → langfristig auffindbare eigene Inhalte.
**Aber:** Qualität vor Quantität. Lieber kein Artikel als ein schwacher. Lieber nicht veröffentlichen als falsch.

---

## 1. Ablauf (Pipeline)

| # | Schritt | Werkzeug |
|---|---------|----------|
| 1 | Fertiges Video + Transkript einlesen | `npm run content:ingest -- "<Video-Ordner>" --video <datei.mp4>` |
| 2 | Hauptthema erkennen | `content-inbox/videos/<slug>/assessment.json` + eigenes Lesen des Transkripts |
| 3 | Entscheiden: Story / integrieren / Moment / nichts | §2 unten |
| 4 | Beste Perspektive bestimmen (Suchintention oder Geschichte) | §3 |
| 5 | Entwurf schreiben | Vorlage `pipeline/templates/story.mdx` → `content-inbox/stories/<slug>/index.mdx` |
| 6 | Jede Aussage gegen das Transkript prüfen | `npm run content:verify -- <story> <transcript.md>` |
| 7 | Bilder/Frames auswählen, zuschneiden, Alt-Texte | `frames/contact-sheet.jpg`, §6 |
| 8 | Titel, SEO-Titel, Beschreibung | §4 |
| 9 | Themen vergeben (nur feste Taxonomie) | `src/config/taxonomy.ts` |
| 10 | Interne Links finden und sinnvoll setzen | `npm run content:links -- <story>` |
| 11 | YouTube-Video verknüpfen | `video: <slug>` im Frontmatter; Video-Eintrag aus `video.md` nach `src/content/videos/` |
| 12 | Social-Metadaten | `social.linkPolicy`, `npm run content:social -- <slug>` |
| 13 | Vorschau | `npm run dev` → http://localhost:4321/stories/<slug>/ (Entwürfe nur nach promote sichtbar; vorher `--dry`) |
| 14 | Veröffentlichen bzw. Freigabe anfordern | `npm run content:promote -- <slug> --transcript <…>` (Gates, §5) |
| 15 | Sitemap, RSS, OG-Bild, Feeds | passiert automatisch beim Build (GitHub Actions) |

Am Ende jeder Runde: `npm run desk` und Stanley kurz berichten (§10).

## 2. Story, Moment oder nichts?

Entscheidend ist **eigenständiger Wert für jemanden, der das Video nie gesehen hat.**

| Material | Entscheidung |
|---|---|
| Zufälliger 15-Sekunden-Clip (Kuh, Wetter) | Nichts – oder ein **Moment**, wenn es eine echte Beobachtung gibt |
| Short mit einer interessanten Erfahrung über Uruguay | **Moment**, oder als Absatz in eine **bestehende Story** integrieren (dann `updatedDate` setzen) |
| Longform „Mit 19 nach Uruguay ausgewandert“ | **Eigenständige Story** (Geschichte) |
| „Was kostet das Leben in Uruguay wirklich?“ | **Eigenständige Story**, `kind: guide` (klare Suchintention) |
| „Meine 40.000-Dollar-Agrardrohne ist abgestürzt“ | **Eigenständige Story** – Risiko prüfen (Schaden, Dritte) |
| „Wie Landwirtschaft in Uruguay funktioniert“ | Story, wenn genug eigene Erfahrung drinsteckt; sonst Moment(e) |

Faustregeln aus `assessment.json`: < 90 s oder < 180 Wörter → kein Artikel. 180–700 Wörter → nur mit klarer
Suchintention oder Geschichte. > 700 Wörter → Story-Kandidat. Gibt es schon eine Story zum gleichen Thema
(`related`), lieber **erweitern** als eine zweite, dünnere Seite anlegen.

## 3. Die Story schreiben

- **Keine Video-Zusammenfassung.** Verboten: „In meinem heutigen Video…“, „Im Video erzähle ich…“.
  Die Story steht für sich. Das Video ist eine Ergänzung (wird automatisch eingebunden).
- **Suchintention zuerst:** Welche Frage hätte jemand bei Google? („mit 19 auswandern“, „Leben in Uruguay Kosten“).
  Titel und erste Absätze beantworten genau diese Frage.
- **Struktur:** Einstieg mitten in der Sache → 4–8 Zwischenüberschriften, die Aussagen sind → konkrete Zahlen und
  Erlebnisse → „Was ich heute anders machen würde“ (nur wenn gesagt) → kein Fazit-Gelaber.
- **Gesprochenes aufräumen:** Wiederholungen, Füllwörter und Abschweifungen raus („Oh, die Kühe kommen!“ ist ein Moment,
  kein Absatz). Reihenfolge darf thematisch statt chronologisch sein.
- **Fakten vs. Erfahrung trennen:** Erfahrung in der Ich-Form („Meine Kälber haben 280 Dollar gekostet“).
  Allgemeine Fakten (Gesetze, Statistiken, Klima) nur mit Quelle in `sources` – sonst weglassen.
- **Nichts erfinden.** Keine Gründe, Gefühle, Zahlen, Orte, Namen oder Anekdoten, die nicht im Transkript oder
  in `content-inbox/sources/belegte-fakten.md` stehen. Unklar? Weglassen oder Stanley fragen.
- **Kurz gesagt / Auf einen Blick / FAQ:** nur mit belegten Aussagen. Das hilft Lesern und Antwortmaschinen.
- **Länge:** so lang wie der Inhalt trägt (typisch 700–1.500 Wörter). Keine künstliche Verlängerung.

## 4. Titel, Beschreibung, URL

- `title`: konkret, ehrlich, ohne Clickbait-Superlative. Eine Frage oder eine Geschichte.
- `seoTitle` (≤ 60 Zeichen) wenn der Titel länger ist. Keine Keyword-Ketten.
- `description`: 70–165 Zeichen, sagt was man erfährt.
- `slug`: kurz, deutsch, sprechend, dauerhaft. **Ein veröffentlichter Slug wird nie geändert.**
- `dek`: 1–2 Sätze in Stanleys Stimme, gern ein wörtliches Zitat.

## 5. Risiko & Veröffentlichung

| Stufe | Beispiele | Regel |
|---|---|---|
| **low** | Alltag, Tiere, Reisen, Wetter, allgemeine persönliche Geschichten | darf automatisch veröffentlicht werden (nach Privacy-Scan) |
| **medium** | geschäftliche Erfahrungen, Preise eigener Einkäufe, Kunden allgemein | automatisch, **wenn** `content:verify` sauber ist und `provenance.transcriptChecked: true`; bei Unsicherheit → Review |
| **high** | Verträge, Streitfälle, Schäden mit Dritten, rechtliche Themen, konkrete Geschäftspartner, Kredite/Zinsen/Schulden, Betrug, Gehälter, sensible Finanzen | **nie ohne Freigabe.** Entwurf bleibt in `content-inbox/`, Stanley prüft, erst dann `reviewedBy: "Stanley Kunz"` |

`assessment.json` schlägt eine Stufe vor (Stichwortliste in `scripts/content/assess.mjs`). Der Agent darf hochstufen,
nie herunterstufen ohne Begründung im Bericht. `content:promote` und das Content-Schema erzwingen die Regeln.

## 6. Bilder

- Eigenes Material vor allem anderen. **Keine Stockfotos.** Keine KI-Bilder.
- Frames aus dem Video: `frames/` (Szenenwechsel). Bei Hochkant-Aufnahmen das Rohmaterial bevorzugen (bessere Auflösung).
- Unkenntlich machen **vor** dem Speichern: Nummernschilder, Telefonnummern, E-Mail-Adressen, Beschriftungen auf
  Fahrzeugen, fremde Gesichter (außer Stanley hat es ausdrücklich erlaubt), Bildschirme mit Daten.
- Speichern als JPEG (max. 2400 px lange Kante, Qualität ~88) unter `src/assets/media/<sprechender-name>.jpg`.
  Metadaten entfernen (EXIF/GPS) – der Privacy-Scan blockiert Bilder mit GPS-Daten.
- Alt-Text beschreibt konkret, was zu sehen ist. Bildunterschrift nur, wenn sie etwas ergänzt.
- Responsive Varianten (AVIF/WebP/JPEG) und das OG-Bild erzeugt der Build automatisch.

## 7. Geschäftsgeheimnisse & Privatsphäre – nie veröffentlichen

Lieferantennamen (wenn nicht bewusst öffentlich) · Ansprechpartner · private E-Mail-Adressen · Telefonnummern ·
Verträge · Zugangsdaten / API-Keys · interne Screens · CRM-Daten · Käuferlisten · exakte Einkaufspreise · Margen ·
laufende Verhandlungen · private Familieninformationen (Namen, Alter, Fotos von Frau und Kind) · private Adressen
oder genaue Standorte · Namen von Mitarbeitern und Piloten (Stanley nennt sie bewusst nicht).

Namen, die nie erscheinen dürfen, gehören in `content-inbox/.private/denylist.txt` (eine Zeile pro Name, nicht im Repo).
`npm run privacy` prüft Inhalte, Konfiguration und das gebaute HTML. **Bei Unsicherheit: nicht veröffentlichen.**

## 8. Interne Verlinkung

- `npm run content:links -- <story>` zeigt Kandidaten. Pro ~150 Wörter höchstens ein Link, nur wo er dem Leser hilft.
- Ankertext = natürliche Formulierung im Satz, nie „hier klicken“.
- Projekte verlinken auf `/projekte/#<slug>`; die offizielle Firmenseite wird dort verlinkt.
- „Weiterlesen“ am Ende und die Video-Verknüpfung entstehen automatisch.

## 9. Social & Metricool

- `social.linkPolicy: deep-dive` nur bei Informationswert (Kosten, Anleitungen, Erfahrungen mit Mehrwert).
  Unterhaltung → `none`: kein Website-Link. Keine Link-Spam-Maschine.
- YouTube bleibt der Hauptkanal; Website-Links tragen UTM-Parameter (`utm_source=<plattform>`), damit die
  Website-Analyse zeigt, welche Plattform Leser bringt.
- `npm run content:social -- <slug>` erzeugt Textvorschläge pro Plattform.
- In Metricool **immer** `createScheduledPostForReview` verwenden (Freigabe durch Stanley), nie direkt veröffentlichen.
  Die Website hängt nicht von Metricool ab.

## 10. Mehrsprachigkeit

Deutsch ist Hauptsprache. Übersetzungen (EN/ES/PT) **nur** als bewusst geprüfte Einträge mit gleichem
`translationKey` – keine automatische Massenübersetzung.

## 11. Abschluss & Bericht an Stanley

Kurz und konkret: was veröffentlicht wurde (Link), was in der Inbox auf Freigabe wartet (mit Grund), welche Videos
keine Story bekommen haben (mit Begründung), offene Fragen. `npm run desk` zeigt den Stand.
