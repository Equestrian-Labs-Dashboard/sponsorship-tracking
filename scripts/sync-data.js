import fs from "fs";
import { readSheet, getSheetsList } from "../src/googleSheets.js";

async function shopify(store, token, name) {
  if (!store || !token) {
    console.log(`Shopify ${name}: sin credenciales`);
    return [];
  }

  let allOrders = [];
  // Agregamos created_at_min para buscar desde Julio (el inicio del programa) y asegurarnos de no perder ninguna orden de Sponsorship
  let url = `https://${store}/admin/api/2026-01/orders.json?status=any&limit=250&created_at_min=2026-07-01T00:00:00Z`;
  
  // Bucle infinito hasta que se acaben las pginas (para traer todo el historial desde Julio)
  while (url) {
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

  // --- NUEVA CONEXIÓN EXTRA PARA COGS EXACTO ---
  // Recopilamos todos los variant_ids únicos de las órdenes
  const variantIds = new Set();
  allOrders.forEach(o => {
    o.line_items.forEach(item => {
      if (item.variant_id) variantIds.add(item.variant_id);
    });
  });

  const costMap = {};
  const vIdsArray = Array.from(variantIds);
  
  // Dividimos en bloques de 100 para no exceder el límite de nodos de GraphQL
  for (let i = 0; i < vIdsArray.length; i += 100) {
    const chunk = vIdsArray.slice(i, i + 100);
    const gidList = chunk.map(id => `"gid://shopify/ProductVariant/${id}"`).join(",");
    
    const query = `
      query {
        nodes(ids: [${gidList}]) {
          ... on ProductVariant {
            legacyResourceId
            inventoryItem {
              unitCost {
                amount
              }
            }
          }
        }
      }
    `;

    try {
      const gqlRes = await fetch(`https://${store}/admin/api/2026-01/graphql.json`, {
        method: 'POST',
        headers: {
          "X-Shopify-Access-Token": token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query })
      });
      const gqlData = await gqlRes.json();
      
      if (gqlData.data && gqlData.data.nodes) {
        gqlData.data.nodes.forEach(node => {
          if (node && node.legacyResourceId && node.inventoryItem && node.inventoryItem.unitCost) {
            costMap[node.legacyResourceId] = parseFloat(node.inventoryItem.unitCost.amount);
          }
        });
      }
    } catch (e) {
      console.log(`Error obteniendo COGS en ${name}:`, e.message);
    }
  }

  // Inyectamos el costo exacto en cada line_item
  allOrders.forEach(o => {
    o.line_items.forEach(item => {
      if (item.variant_id && costMap[item.variant_id] !== undefined) {
        item.exact_cost = costMap[item.variant_id];
      }
    });
  });

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
