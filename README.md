# Sponsorship Tracking Draft

Static GitHub Pages draft prepared for a future **Shopify + QuickBooks** pipeline. The current UI runs on mock data and intentionally separates source facts from derived/manual tracker fields.

## What is included
- Executive overview with Sponsorship Orders, Sponsored Units, Retail Value, Product Cost and Recipients.
- Monthly activity and breakdown by sponsorship type.
- Detailed Sponsorship Register with exact detection reason.
- QuickBooks Accounting Match view.
- Review Queue for ambiguous/unmatched records.
- Methodology page describing source ownership and classification rules.
- Date, quarter, type and accounting-match filters.
- CSV export.

## Data ownership
### Shopify source fields
Use Shopify Admin GraphQL Order/LineItem data for order id/name, created date, customer/recipient, tags, notes/custom attributes, discount codes/applications, financial status, fulfillment status, line items, SKU, quantity, pricing and relevant product/inventory cost data when available to the app.

### QuickBooks source fields
Use QuickBooks Online purchase/bill/expense transactions for transaction date, vendor/entity, reference number, amount, memo, account/item lines and account references. Exact availability depends on the transaction type and the company's QBO configuration.

### Derived tracker fields
`sponsorship_type`, `detected_by`, `confidence`, `accounting_match_status`, and review notes are produced by ETL/reconciliation logic. They are not claimed to be native Shopify/QB fields.

## Recommended normalized dataset
```json
{
  "date": "YYYY-MM-DD",
  "order_id": "Shopify GraphQL ID",
  "order_name": "#1234",
  "recipient": "...",
  "customer_id": "...",
  "product_id": "...",
  "variant_id": "...",
  "product": "...",
  "sku": "...",
  "qty": 1,
  "retail_value": 0,
  "product_cost": 0,
  "currency": "USD",
  "financial_status": "PAID",
  "fulfillment_status": "FULFILLED",
  "sponsorship_type": "Product Seeding",
  "detected_by": "Order tag: seeded",
  "confidence": "High",
  "qb_txn_id": null,
  "qb_vendor": null,
  "qb_account": null,
  "qb_amount": null,
  "accounting_match_status": "Shopify Only"
}
```

## Suggested pipeline
`Shopify GraphQL -> scripts/extract_shopify.py -> classification/reconciliation -> data/dashboard.json <- scripts/extract_qbo.py <- QuickBooks Online`

Then GitHub Pages reads only `data/dashboard.json`.

## GitHub Pages
Upload all files to a repository. In GitHub: **Settings -> Pages -> Deploy from a branch -> main / root**. No secrets are needed for this mock-only draft.

When API connections are added, secrets belong in **GitHub Actions Secrets**, never in browser JavaScript or committed files.

## Important scope rule
This draft does **not** assume influencer ROI, generated revenue, CAC, ROAS, social engagement, contract value or campaign budget. Those can be added only if a later requirement/source supports them.
