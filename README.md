# Corro Sponsorship Tracking Draft

Modern GitHub Pages draft for **Sponsorship Tracking**, prepared for future **Shopify + QuickBooks** connections.

## Included now

- Corro-inspired visual theme.
- Light / dark mode toggle with **sun and moon**.
- Functional dashboard using mock data.
- Views:
  - Overview
  - Sponsorship Register
  - Accounting Match
  - Review Queue
  - Methodology
- Export CSV.
- `.github/workflows` included for GitHub Pages deployment.

## Project structure

```text
sponsorship-tracking-draft/
├── .github/
│   └── workflows/
│       ├── deploy-pages.yml
│       └── refresh-data-placeholder.yml
├── assets/
│   ├── app.js
│   ├── corro-logo.png
│   └── styles.css
├── data/
│   └── mock-data.json
├── scripts/
│   └── normalize_example.py
├── index.html
└── README.md
```

## Deploy on GitHub Pages

1. Upload the full project to a GitHub repository.
2. Push to `main`.
3. In GitHub:
   - **Settings → Pages**
   - Source: **GitHub Actions**
4. The included workflow `deploy-pages.yml` will publish the site automatically.

## Current status

This is still a **draft dataset version**.

That means:
- UI is ready.
- Data structure is ready.
- Shopify and QuickBooks connections are **not yet live**.
- Mock data can later be replaced by a generated `dashboard.json` or equivalent normalized file.

## Future live pipeline

```text
Shopify -> sponsorship detection ETL -> normalized dataset
QuickBooks -> accounting reconciliation -> normalized dataset
normalized dataset -> GitHub Pages dashboard
```

## Suggested future secrets for GitHub Actions

When you connect live data later, typical secrets may include:

- `SHOPIFY_STORE`
- `SHOPIFY_ACCESS_TOKEN`
- `QB_CLIENT_ID`
- `QB_CLIENT_SECRET`
- `QB_REALM_ID`
- `QB_REFRESH_TOKEN`

Do **not** add them now if you are still working with mock data only.
