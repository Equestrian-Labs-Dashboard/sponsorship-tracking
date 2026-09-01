import fs from "fs";
import { readSheet, getSheetsList } from "../src/googleSheets.js";

async function shopify(store, token, name) {
  if (!store || !token) {
    console.log(`Shopify ${name}: sin credenciales`);
    return [];
  }

  let allOrders = [];
  let url = `https://${store}/admin/api/2026-01/orders.json?status=any&limit=250`;
  
  for (let i = 0; i < 10; i++) { // Fetch up to 10 pages (2500 orders)
    if (!url) break;
    const response = await fetch(url, {
      headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" }
    });

    if (!response.ok) throw new Error(`Shopify ${name}: ${response.status}`);
    
    const data = await response.json();
    if (data.orders) allOrders = allOrders.concat(data.orders);
    
    const link = response.headers.get("link");
    if (link && link.includes('rel="next"')) {
      const match = link.match(/<([^>]+)>; rel="next"/);
      url = match ? match[1] : null;
    } else {
      url = null;
    }
  }
  return allOrders;
}

async function main() {
  console.log("HOJAS DISPONIBLES:");
  console.log(await getSheetsList());

  const data = {
    quickbooks: {
      bills: await readSheet("QuickBooks Bill"),
      vendorBalance: await readSheet("QuickBooks Vendor Balance Detail Import"),
      ledger: await readSheet("QuickBooks General Ledger Import"),
      transactions: await readSheet("QuickBooks Transaction List By Vendor Import"),
      payables: await readSheet("Payables")
    },
    shopify: {
      corro: await shopify(
        process.env.CORRO_SHOPIFY_STORE,
        process.env.CORRO_SHOPIFY_ACCESS_TOKEN,
        "CORRO"
      ),
      cavali: await shopify(
        process.env.CAVALI_SHOPIFY_STORE,
        process.env.CAVALI_SHOPIFY_ACCESS_TOKEN,
        "CAVALI"
      )
    }
  };

  fs.mkdirSync("data", { recursive: true });

  fs.writeFileSync(
    "data/dashboard.json",
    JSON.stringify(data, null, 2),
    "utf8"
  );

  console.log("OK dashboard.json creado");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
