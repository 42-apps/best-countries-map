# Best Countries to Live Map 🌍

**Where on Earth to live & work — the whole world, ranked on what makes a place good to live.**

An interactive 3D globe that paints every country by how good a place it is to live and
work — **green** for the best, **yellow** for the middling, **red** for the toughest —
across **19 dimensions**, from healthcare and safety to climate, food, nature, spirituality
and fun. There is no single "best country", only the best country *for you*: set your own
priority weights (or pick a preset) and the whole map rebuilds around what matters to you.
Part of the [42-apps](https://42-apps.github.io/) collection, built with
[globe.gl](https://globe.gl).

**Live:** https://42-apps.github.io/best-countries-map/  ·  **v0.1.3**

## What it does

- **Choropleth globe & flat map** — 196 countries coloured (and extruded into a 3D relief)
  by a weighted "overall livability" score, green (best) → red (toughest).
- **Look from any angle** — tap any of the 19 dimensions up top (Healthcare, Climate, Food,
  Spirituality, Fun…) to map that one thing alone. *Most spiritual? Most fun? Cleanest?*
  Each has its own ranking and recoloured globe.
- **Build your own index** — the **⚖️ Your priorities** drawer has a 0–5 slider for every
  dimension. Drag them and the map + ranking rebuild live.
- **Presets** — one-click priority profiles: Balanced, Retiree, Digital nomad, Young family,
  Career-driven, Foodie, Nature lover, Tax exile, Freedom seeker, **Spiritual seeker** and
  **Fun & social**.
- **Country profiles** — click a country for a 19-axis radar chart, its strengths &
  weaknesses, world rank, and life-satisfaction reference.
- **Full data table** — every country × every dimension in one sortable, colour-coded table.
- Search, region filters, deep-linking (`?c=JPN`, `?m=climate`, `?preset=retiree`),
  auto-rotate, fullscreen and a responsive mobile layout.

## The 19 dimensions

| Group | Dimensions |
|-------|-----------|
| **Health & safety** | Healthcare · Population health · Safety & stability · Clean environment |
| **Society & freedom** | Govt integrity · Personal freedom · Education · Openness |
| **Money & work** | Opportunity & jobs · Affordability · Low tax burden · Work–life balance · Infrastructure |
| **Place, culture & soul** | Climate · Landscape & nature · Food · Arts & culture · Spirituality · Fun & recreation |

Life satisfaction (World Happiness ladder) is shown on each profile **for reference** and is
not part of the score.

## Data & method

Every score is normalised to **0–100** (100 = world-best). Each dimension is calibrated to
the best available public indices, and the inherently subjective ones blend those with
expert estimates. Sources include:

- **Healthcare / Safety / Affordability / Pollution / Climate** — Numbeo by-country indices
- **Population health** — life expectancy (UN/WHO)
- **Clean environment** — Yale Environmental Performance Index (air & water)
- **Govt integrity** — Transparency International CPI
- **Personal freedom** — Freedom House + RSF Press Freedom + Cato Human Freedom Index
- **Education** — OECD PISA 2022 + World Bank harmonised learning
- **Openness** — Gallup Migrant Acceptance + EF English Proficiency
- **Opportunity** — GDP per capita (PPP) + employment (World Bank)
- **Low tax** — headline personal-income, capital-gains, VAT, corporate, social-security & estate rates (the sibling [GlobalTax](https://github.com/martingluckman/globaltax) dataset, weighted toward personal income tax), with World Bank tax-to-GDP as fallback
- **Work–life** — statutory paid leave + average annual hours
- **Infrastructure** — World Bank Logistics Performance Index + median internet speed
- **Landscape / Food / Arts & culture / Spirituality / Fun** — expert estimates anchored to
  proxies (UNESCO natural & cultural sites, protected land, TasteAtlas & Michelin, sacred
  geography & religiosity, sport & social-life vibrancy)

This is an **opinionated atlas and a conversation starter**, not an official ranking.
Subjective dimensions are exactly that — subjective. Corrections are warmly welcome.

## Run it

It's a static site — no build step.

```bash
python3 -m http.server 8771 --directory best-countries-map
# open http://localhost:8771
```

## Rebuild the data

```bash
python3 build_scores.py     # reads data/raw/*.json → writes data/countries.js
```

## Files

| File | Purpose |
|------|---------|
| `index.html` | Markup & overlays |
| `app.css` | Styling (green → gold livability theme) |
| `app.js` | Globe, weighting engine, layers, ranking, profiles, table |
| `data/countries.js` | 196 countries × 19 dimensions (built) |
| `data/countries.geojson` | Natural Earth country boundaries |
| `data/raw/*.json` | Source index data from the research sweep (provenance) |
| `data/raw/globaltax-tax-data.js` | Headline per-country tax rates, vendored from the [GlobalTax](https://github.com/martingluckman/globaltax) project |
| `build_scores.py` | Regenerates `countries.js` from `data/raw/` + expert curation |
| `lib/globe.gl.min.js` | 3D globe engine |

Figures are best-available estimates and expert judgement; corrections welcome.
