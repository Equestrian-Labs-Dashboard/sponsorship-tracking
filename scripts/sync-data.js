import fs from "fs";
import { readSheet, getSheetsList } from "../src/googleSheets.js";

async function shopify(store, token, name) {
  const response = await fetch(
    `https://${store}/admin/api/2026-01/orders.json`,
    {
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json"
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Shopify ${name}: ${response.status}`);
  }

  const data = await response.json();
  return data.orders || [];
}

async function main() {
  console.log(
 "HOJAS DISPONIBLES:"
);

console.log(
 await getSheetsList()
);

  const data = {
    quickbooks: {
      bills: await readSheet("QuickBooks Bill"),
      vendorBalance: await readSheet("QuickBooks Vendor Balance Detail Import"),
      ledger: await readSheet("QuickBooks General Ledger Import"),
     transactions:
await readSheet(
"QuickBooks Transaction List By Vendor Import"
),
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

  fs.mkdirSync("data", {recursive:true});

  fs.writeFileSync(
    "data/dashboard.json",
    JSON.stringify(data,null,2),
    "utf8"
  );

  console.log("OK dashboard.json creado");
}

main().catch(err=>{
  console.error(err);
  process.exit(1);
});
