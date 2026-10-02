# Deployment & DNS

## Bestehende Infrastruktur (geprüft am 2. Oktober 2026)

| | |
|---|---|
| Domain-Registrar / DNS | Spaceship (`launch1.spaceship.net`, `launch2.spaceship.net`) |
| `kunzglobal.com` | A-Records auf GitHub Pages (185.199.108–111.153), Repo `StaninjoK/KunzGlobal` |
| `www.kunzglobal.com` | CNAME `staninjok.github.io` |
| E-Mail | Google Workspace (MX `aspmx.l.google.com`) |
| `stanley.kunzglobal.com` | war frei, kein Wildcard-Eintrag |

## Ziel-Setup

- Neues Repository **`StaninjoK/stanley-kunz`** (öffentlich, GitHub Pages über GitHub Actions).
- Pages-Custom-Domain **`stanley.kunzglobal.com`**, „Enforce HTTPS“ an.
- **Ein** zusätzlicher DNS-Eintrag bei Spaceship:

| Typ | Host / Name | Wert | TTL |
|---|---|---|---|
| CNAME | `stanley` | `staninjok.github.io` | Automatisch / 30 min |

Nichts anderes wird geändert: keine A-Records, kein `www`, keine MX/TXT-Einträge. kunzglobal.com und die E-Mail bleiben unberührt.

## Ablauf

1. Code nach GitHub pushen (`main`). Die Action baut, testet und veröffentlicht.
2. Repository → Settings → Pages → Source: **GitHub Actions**; Custom domain: `stanley.kunzglobal.com`.
3. Spaceship → Domains → kunzglobal.com → **DNS**/Advanced DNS → Add record → CNAME `stanley` → `staninjok.github.io`.
4. Nach der DNS-Auflösung (meist Minuten, max. ein paar Stunden) in den Pages-Settings **Enforce HTTPS** aktivieren
   (GitHub stellt das Let's-Encrypt-Zertifikat automatisch aus).
5. Optional, empfohlen: GitHub → Settings (Profil) → Pages → **Verified domains** → `kunzglobal.com` verifizieren (TXT-Eintrag
   `_github-pages-challenge-staninjok`). Schützt die Subdomains vor Übernahme durch fremde Repos.

## Laufender Betrieb

- Jeder Push auf `main` → Build, Tests, Deployment (~3–4 Minuten).
- Alle 6 Stunden: YouTube-Sync + Veröffentlichung geplanter Stories (Cron in `.github/workflows/deploy.yml`).
- Manuell: Actions → „Build, test & deploy“ → *Run workflow*.
- Fehlgeschlagene Prüfung (z. B. Privacy-Scan) → es wird **nichts** veröffentlicht; die Live-Seite bleibt auf dem letzten guten Stand.
