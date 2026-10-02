# Content-System – so wächst die Seite mit deinen Videos

## Der normale Ablauf (du filmst, der Rest läuft)

1. **Video fertig** – wie bisher im Ordner `Youtube/Fertig/<Video>` mit `YouTube_Texte.txt`, `Untertitel_DE.srt`, Thumbnail.
2. **Claude startet die Pipeline** (z. B. Auftrag: „Mach aus Video 4 Website-Content“):
   `npm run content:ingest -- "…/Youtube/Fertig/Video 4 …" --video <Rohdatei oder fertiges Video>`
   → Transkript, Bildkandidaten, Vorbewertung und ein Arbeitsauftrag in `content-inbox/videos/<slug>/BRIEF.md`.
3. **Entscheidung** nach festen Regeln (`pipeline/AGENT.md` §2): eigene Story, bestehende Story erweitern, Moment(e) oder nichts.
4. **Entwurf** in `content-inbox/stories/<slug>/` – geschrieben nach `pipeline/VOICE.md`, jede Zahl und jedes Zitat gegen das
   Transkript geprüft (`content:verify`).
5. **Veröffentlichen** mit `content:promote`. Das Werkzeug prüft Pflichtfelder, Risiko, Datenschutz und Fakten. Danach `git push` –
   die Seite ist nach ~3 Minuten live. Ein Datum in der Zukunft = geplant, erscheint automatisch.
6. **YouTube**: Sobald das Video öffentlich ist, verknüpft der automatische Sync (alle 6 h) Video, Story und Seite. Du musst nichts eintragen.
7. **Social**: `content:social` erzeugt Textvorschläge; Claude plant sie in Metricool **zur Freigabe** ein.

## Wo du entscheidest

| Risiko | Was | Was passiert |
|---|---|---|
| niedrig | Alltag, Tiere, Reisen, persönliche Geschichten | geht nach den automatischen Prüfungen live |
| mittel | geschäftliche Erfahrungen | live, wenn alle Aussagen im Transkript belegt sind; sonst fragt Claude |
| hoch | Kredite, Zinsen, Schäden, Verträge, Streit, Partner, sensible Zahlen | **wartet auf dich** – bleibt in der Inbox, bis du freigibst |

**Freigeben:** Entwurf lesen (Content-Desk: `npm run desk` → `desk/index.html`, oder direkt die Datei), dann Claude sagen
„Story X freigegeben“. Claude trägt `reviewedBy: "Stanley Kunz"` ein und veröffentlicht.

**Aktuell wartet:** „Ohne Eigenkapital ins Drohnen-Business: 20 % Zinsen, ein Abdrift-Schaden und zwei Crashs“ (aus Video 3).
Grund für „hoch“: Kreditkonditionen, Schaden bei einem Dritten (Abdrift), unbezahlter früherer Job, Betrug.

## Was nie automatisch veröffentlicht wird

Lieferanten, Ansprechpartner, private Kontaktdaten, Verträge, Zugangsdaten, interne Screens, CRM-/Käuferdaten, Einkaufspreise,
Margen, Verhandlungen, private Familiendetails, genaue Adressen/Standorte, Namen von Mitarbeitern.
Namen, die nie erscheinen dürfen, kommen in `content-inbox/.private/denylist.txt` (eine Zeile pro Name).

## Selbst etwas ändern

- **Text korrigieren:** Datei unter `src/content/…` bearbeiten → speichern → `git push`. Bei Stories `updatedDate` setzen.
- **Neues Foto:** nach `src/assets/media/` (JPEG, max. 2400 px, ohne GPS) und im Frontmatter verwenden.
- **Social-Link verifizieren:** in `src/config/site.ts` bei TikTok/X/LinkedIn `verified: true` setzen, sobald der Handle stimmt.
- **Über-mich-Seite erweitern:** `src/content/pages/ueber-mich.mdx`, `updatedDate` anpassen.
- **Timeline:** `src/content/timeline/journey.yaml`.

## Content-Typen

| Typ | Wofür | Beispiel |
|---|---|---|
| Story | eigenständiger Artikel mit Mehrwert ohne Video | „Mit 19 nach Uruguay ausgewandert“ |
| Story (guide) | Suchartikel mit klarer Frage | „Was kostet das Leben in Uruguay wirklich?“ |
| Video | jedes längere YouTube-Video, mit Kapiteln | automatisch + Kontext |
| Moment | kurze Beobachtung, Bild/Loop/Text | „Zum ersten Mal kamen sie von allein“ |
| Projekt | persönliche Sicht auf ein Unternehmen | Kunz Agrotech |
| Timeline | Station im Leben | „2022 – Mit 19 nach Uruguay“ |
