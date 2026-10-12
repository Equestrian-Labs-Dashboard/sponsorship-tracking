import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readSheet } from "../src/googleSheets.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-10";
const DEFAULT_START_DATE = `${new Date().getUTCFullYear()}-01-01`;
const START_DATE = String(process.env.SPONSORSHIP_START_DATE || DEFAULT_START_DATE).trim();
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const numeric = value => Number.isFinite(Number(value)) ? Number(value) : 0;

function readRules() {
  const parsed = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "sponsorship-rules.json"), "utf8"));
  if (!Array.isArray(parsed.rules) || !parsed.rules.length) throw new Error("config/sponsorship-rules.json must contain at least one confirmed rule");
  return parsed;
}

function orderFields(order) {
  return {
    tags: String(order.tags || ""),
    note: String(order.note || ""),
    note_attributes: (order.note_attributes || []).map(attribute => `${attribute.name || "attribute"}: ${attribute.value || ""}`).join(" | "),
    discount_codes: (order.discount_codes || []).map(discount => `${discount.code || ""} ${discount.type || ""}`).join(" | "),
  };
}

function findEvidence(order, rules) {
  const fields = orderFields(order);
  for (const rule of rules) {
    for (const field of Array.isArray(rule.fields) ? rule.fields : []) {
      const text = String(fields[field] || "");
      const lowered = text.toLowerCase();
      for (const term of rule.terms || []) {
        if (lowered.includes(String(term).toLowerCase())) {
          return { type: rule.type, rule_id: rule.id, field, text, matched_term: term };
        }
      }
    }
  }
  return null;
}

function reviewReason(order, reviewTerms) {
  const fields = orderFields(order);
  for (const [field, text] of Object.entries(fields)) {
    const lowered = text.toLowerCase();
    const term = (reviewTerms || []).find(candidate => lowered.includes(String(candidate).toLowerCase()));
    if (term) return `Candidate signal in ${field}: ${term}; no confirmed sponsorship rule matched.`;
  }
  if (numeric(order.current_total_price ?? order.total_price) === 0) return "Zero-value order without a confirmed sponsorship rule.";
  return "";
}

async function requestJson(url, options, label) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(url, options);
    if (response.ok) return { response, data: await response.json() };
    const body = await response.text().catch(() => "");
    lastError = new Error(`${label} failed (${response.status}): ${body.slice(0, 280)}`);
    if (response.status !== 429 && response.status < 500) throw lastError;
    const retryAfter = Number(response.headers.get("retry-after"));
    await sleep(Number.isFinite(retryAfter) ? retryAfter * 1000 : 900 * (attempt + 1));
  }
  throw lastError || new Error(`${label} failed`);
}

function nextPageUrl(linkHeader) {
  const match = String(linkHeader || "").match(/<([^>]+)>;\s*rel="next"/);
  return match ? match[1] : null;
}

async function fetchOrders(store, token, label) {
  const start = new Date(`${START_DATE}T00:00:00Z`);
  if (Number.isNaN(start.valueOf())) throw new Error(`SPONSORSHIP_START_DATE is invalid: ${START_DATE}`);
  const initial = new URL(`https://${store}/admin/api/${API_VERSION}/orders.json`);
  initial.searchParams.set("status", "any");
  initial.searchParams.set("limit", "250");
  initial.searchParams.set("created_at_min", start.toISOString());
  let url = initial.toString();
  const orders = [];
  while (url) {
    const { response, data } = await requestJson(url, { headers: { "X-Shopify-Access-Token": token, accept: "application/json" } }, `Shopify ${label} orders`);
    orders.push(...(Array.isArray(data.orders) ? data.orders : []));
    url = nextPageUrl(response.headers.get("link"));
    if (url) await sleep(500);
  }
  return orders;
}

async function fetchCurrentCosts(store, token, variantIds, label) {
  const costs = new Map();
  const ids = [...variantIds].filter(Boolean);
  for (let index = 0; index < ids.length; index += 100) {
    const variables = { ids: ids.slice(index, index + 100).map(id => `gid://shopify/ProductVariant/${id}`) };
    const query = `query SponsorshipCosts($ids: [ID!]!) { nodes(ids: $ids) { ... on ProductVariant { legacyResourceId inventoryItem { unitCost { amount currencyCode } } } } }`;
    const { data } = await requestJson(`https://${store}/admin/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": token, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ query, variables }),
    }, `Shopify ${label} inventory costs`);
    if (data.errors?.length) throw new Error(`Shopify ${label} inventory costs: ${data.errors.map(error => error.message).join("; ")}`);
    for (const node of data.data?.nodes || []) {
      const amount = node?.inventoryItem?.unitCost?.amount;
      if (node?.legacyResourceId && amount !== null && amount !== undefined && amount !== "") costs.set(String(node.legacyResourceId), numeric(amount));
    }
    if (index + 100 < ids.length) await sleep(500);
  }
  return costs;
}

function allocateLineNetSales(order) {
  const items = Array.isArray(order.line_items) ? order.line_items : [];
  const gross = items.map(item => numeric(item.price) * numeric(item.quantity));
  const grossSubtotal = gross.reduce((total, value) => total + value, 0);
  const orderSubtotal = numeric(order.current_subtotal_price ?? order.subtotal_price);
  if (grossSubtotal <= 0 || orderSubtotal < 0) return items.map(() => 0);
  const ratio = Math.min(1, orderSubtotal / grossSubtotal);
  return gross.map(value => value * ratio);
}

function customerName(order) {
  const customer = order.customer || {};
  return `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || order.email || "";
}

async function extractStore({ label, store, token }, rules) {
  const orders = await fetchOrders(store, token, label);
  const eligible = orders.filter(order => !order.cancelled_at && !order.test);
  const variantIds = new Set(eligible.flatMap(order => (order.line_items || []).map(item => item.variant_id && String(item.variant_id)).filter(Boolean)));
  const costs = await fetchCurrentCosts(store, token, variantIds, label);
  const sponsorships = [];
  const reviewQueue = [];

  for (const order of eligible) {
    const evidence = findEvidence(order, rules.rules);
    if (!evidence) {
      const reason = reviewReason(order, rules.reviewTerms);
      if (reason) reviewQueue.push({ store: label, order_id: String(order.id || ""), order_name: order.name || String(order.id || ""), created_at: order.created_at, customer: customerName(order), review_reason: reason });
      continue;
    }
    const lineNetSales = allocateLineNetSales(order);
    (order.line_items || []).forEach((item, index) => {
      sponsorships.push({
        store: label,
        order_id: String(order.id || ""),
        order_name: order.name || String(order.id || ""),
        created_at: order.created_at,
        financial_status: order.financial_status || "",
        fulfillment_status: order.fulfillment_status || "",
        customer: customerName(order),
        product_title: item.title || item.name || "",
        sku: item.sku || "",
        variant_id: item.variant_id ? String(item.variant_id) : "",
        quantity: numeric(item.quantity),
        retail_value: numeric(item.price) * numeric(item.quantity),
        net_sales: lineNetSales[index] ?? 0,
        current_unit_cost: item.variant_id && costs.has(String(item.variant_id)) ? costs.get(String(item.variant_id)) : null,
        current_cost_currency: "USD",
        type: evidence.type,
        evidence,
      });
    });
  }
  return { sponsorships, reviewQueue, scanned: orders.length, excluded: orders.length - eligible.length };
}

async function readOptionalAccounting() {
  if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return [];
  const tabs = ["QuickBooks Bill", "QuickBooks Vendor Balance Detail Import", "QuickBooks General Ledger Import", "QuickBooks Transaction List By Vendor Import", "Payables"];
  const rows = [];
  for (const tab of tabs) {
    try {
      rows.push(...(await readSheet(tab)).map(row => ({ ...row, source_tab: tab })));
    } catch (error) {
      console.warn(`Optional accounting tab ${tab} was not imported: ${error.message}`);
    }
  }
  return rows;
}

async function main() {
  const rules = readRules();
  const sources = [
    { label: "Corro", store: String(process.env.CORRO_SHOPIFY_STORE || "").trim(), token: String(process.env.CORRO_SHOPIFY_ACCESS_TOKEN || "").trim() },
    { label: "Cavali Club", store: String(process.env.CAVALI_SHOPIFY_STORE || "").trim(), token: String(process.env.CAVALI_SHOPIFY_ACCESS_TOKEN || "").trim() },
  ].filter(source => source.store && source.token);
  if (!sources.length) throw new Error("Configure at least one Shopify store and access token before generating the dashboard.");

  const extracted = [];
  for (const source of sources) extracted.push(await extractStore(source, rules));
  const sponsorships = extracted.flatMap(result => result.sponsorships);
  const reviewQueue = extracted.flatMap(result => result.reviewQueue);
  const counts = extracted.reduce((total, result) => ({ scanned: total.scanned + result.scanned, excluded: total.excluded + result.excluded }), { scanned: 0, excluded: 0 });
  const output = {
    meta: {
      status: "verified",
      generated_at: new Date().toISOString(),
      shopify_api_version: API_VERSION,
      start_date: START_DATE,
      stores: sources.map(source => source.label),
      rules_version: rules.version,
      orders_scanned: counts.scanned,
      excluded_orders: counts.excluded,
      qualified_line_items: sponsorships.length,
      review_items: reviewQueue.length,
      cogs_note: "Current Shopify inventory item unit cost captured at synchronization time; not historical invoice-level COGS.",
    },
    sponsorships,
    review_queue: reviewQueue,
    accounting: await readOptionalAccounting(),
  };
  fs.mkdirSync(path.join(ROOT, "data"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "data", "dashboard.json"), `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Verified Sponsorship dataset created: ${sponsorships.length} qualified line items, ${reviewQueue.length} review items.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
