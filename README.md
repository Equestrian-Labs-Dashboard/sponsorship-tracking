# Corro Sponsorship Tracking

Protected sponsorship tracking report for `https://sponsorship-tracking-report.pages.dev/`.

The published dashboard contains no example data. It only renders `data/dashboard.json` after the GitHub workflow extracts Shopify records using confirmed sponsorship rules.

## What is counted

- An order line is included only when a configured rule matches Shopify order `tags`, `note`, `note_attributes`, or `discount_codes`.
- The matching field, source text, rule id and matched term stay on every exported line.
- Canceled and test orders are excluded.
- Zero-value or candidate marketing orders that do not match a confirmed rule are held in **Review Queue**; they do not change report totals.
- `Current COGS` is Shopify's current inventory-item cost at sync time. It is not historical invoice-level COGS and is not treated as financial gross profit.

The initially confirmed rules are in [config/sponsorship-rules.json](config/sponsorship-rules.json). Add a term only after Ceci confirms the exact tag, note text, attribute or discount code used in Shopify.

## Shopify reconciliation

See [docs/SHOPIFY_RECONCILIATION.md](docs/SHOPIFY_RECONCILIATION.md) for the precise Shopify checks and expected reconciliation fields.

## Access sheet

Use one restricted spreadsheet named **Corro & Cavali - Report Access Registry** with a tab named `User Access Registry` and these headers:

`User Name | Email | Report Access | Comments | Branch`

For Marketing users and Berna, set `Report Access` to `Sponsorship` (or `All`). `Branch` is optional for this report.

The Google service-account email stored in `GOOGLE_CREDENTIALS` must have **Viewer** access to this spreadsheet. Keep general access set to **Restricted**.

## Cloudflare Pages configuration

This project uses Pages Functions for sign-in, authorization and data protection. Deploy through the included GitHub workflow or Wrangler; Cloudflare Pages Direct Upload does not deploy a `functions/` directory.

Create the Pages project `sponsorship-tracking-report`, connect the repository, then configure the following Pages production variables:

| Variable | Type | Purpose |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | Text | Google OAuth web client ID |
| `USER_REGISTRY_SHEET_ID` | Text | Access Registry spreadsheet ID |
| `USER_REGISTRY_TAB` | Text | `User Access Registry` |
| `USER_REGISTRY_CACHE_SECONDS` | Text | `30` |
| `ACCESS_LOG_SHEET_ID` | Text | Same registry Sheet ID, or a separate restricted log Sheet |
| `ACCESS_LOG_TAB` | Text | `Access Logs` |
| `GOOGLE_CREDENTIALS` | Secret | Full service-account JSON used by Pages Functions |
| `SESSION_SECRET` | Secret | Random string of at least 32 characters |

Add `https://sponsorship-tracking-report.pages.dev` as an authorized JavaScript origin to the existing Google OAuth Web client. Set Pages runtime to **fail closed**.

The GitHub workflow needs these repository secrets:

- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
- `CORRO_SHOPIFY_STORE`, `CORRO_SHOPIFY_ACCESS_TOKEN`
- Optional: `CAVALI_SHOPIFY_STORE`, `CAVALI_SHOPIFY_ACCESS_TOKEN`
- Optional QuickBooks import: `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON`

The Shopify app needs `read_orders`, `read_products`, and `read_inventory`. It also needs `read_all_orders` when the selected start date is more than 60 days in the past.

`SPONSORSHIP_START_DATE` is an optional GitHub repository variable in `YYYY-MM-DD` format. It defaults to January 1 of the current year.
