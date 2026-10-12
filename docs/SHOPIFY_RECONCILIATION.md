# Shopify Reconciliation - Sponsorship Tracking

Use the same Shopify store and the same date range shown by the report metadata.

1. In **Shopify Admin > Orders**, select the date range. Search one confirmed tag at a time, for example `tag:sponsorship` and then `tag:sponsored`. Combine the results by order number; do not add the same order twice.
2. Open a sample of the matching orders. Check the order number, creation date, line item, SKU, quantity and the exact field that triggered the result. The report's **Classification evidence** column must show the same tag, note, custom attribute or discount code.
3. Export the filtered orders from Shopify and download the dashboard CSV using the same date filter. Reconcile by **order number + SKU + quantity**. Gross merchandise value is the line price times quantity; net sales is allocated from Shopify's order subtotal and excludes shipping and taxes.
4. Review **Review Queue** separately. These are zero-value or candidate orders with a possible marketing signal but no confirmed sponsorship rule. They are deliberately excluded from totals until Ceci approves a rule.
5. For a COGS spot check, open the SKU in **Products > Inventory** and compare Cost per item with `Current Shopify cost`. This value is current catalog cost, not historic purchase cost. Use QuickBooks/invoice records for accounting COGS and financial gross profit.

If Shopify counts differ, check canceled/test orders first, then the start date, then the exact rule text in `config/sponsorship-rules.json`. Do not change a rule simply to force totals to match; retain the evidence and ask Ceci to confirm the business rule.
