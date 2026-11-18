# Červený pomeranč

Tržiště zájezdů s reálnými nabídkami partnerů (Dovolená.cz, Invia.cz).

- `web/` – web (statické HTML/CSS/JS). Data si načítá z `data/` (generuje se, není v repu).
- `feeds/` – stažení XML feedů partnerů a převod do dat pro web (`node convert.mjs`). Seznam feedů je ve `feeds/feeds.json`.
- `.github/workflows/feeds.yml` – každé 2 hodiny: stáhne feedy → přepočítá → nasadí hotový web do větve `site`.
- Cloudflare Pages publikuje větev `site` na cervenypomeranc.cz.

Ruční aktualizace: GitHub → Actions → „Aktualizace webu“ → Run workflow.

Affiliate ID: Invia `aid=2803411`, Dovolená.cz = číslo XML kampaně (`cid`) v odkazech feedu.
