let DATA = { sponsorships: [], reviewQueue: [], accounting: [], meta: {} };
let LOAD_ERROR = "";
let FILTERS = { month: "all", quarter: "all", type: "all", search: "" };

const $ = selector => document.querySelector(selector);
const number = value => {
  const parsed = typeof value === "string" ? Number(value.replace(/[^0-9.-]+/g, "")) : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const hasNumber = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(number(value));
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
const sourceDate = value => String(value || "").slice(0, 10);
const monthLabel = month => {
  const date = new Date(`${month}-01T00:00:00Z`);
  return Number.isNaN(date.valueOf()) ? month : new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
};

function className(value) {
  return String(value || "not-linked").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function badge(value) {
  const label = String(value || "Not linked");
  return `<span class="badge ${className(label)}">${escapeHtml(label)}</span>`;
}

function orderKey(row) {
  return String(row.order_name || row.order_id || "");
}

function rowsForFilters() {
  return DATA.sponsorships.filter(row => {
    const month = sourceDate(row.created_at).slice(0, 7);
    if (FILTERS.month !== "all" && month !== FILTERS.month) return false;
    if (FILTERS.quarter !== "all") {
      const date = new Date(row.created_at);
      if (Number.isNaN(date.valueOf()) || `Q${Math.floor(date.getUTCMonth() / 3) + 1}` !== FILTERS.quarter) return false;
    }
    if (FILTERS.type !== "all" && row.type !== FILTERS.type) return false;
    const query = FILTERS.search.trim().toLowerCase();
    if (!query) return true;
    return [row.order_name, row.customer, row.product_title, row.sku, row.evidence?.text, row.evidence?.field]
      .some(value => String(value || "").toLowerCase().includes(query));
  });
}

function setDataStatus(text, healthy = true) {
  const status = $("#dataStatus");
  if (status) status.textContent = text;
  const dot = $(".status span");
  if (dot) dot.style.background = healthy ? "" : "#b56d00";
}

function emptyFilterMessage() {
  if (FILTERS.month !== "all") {
    return `No qualified sponsorship activity was identified in the verified Shopify data for ${monthLabel(FILTERS.month)}. No order matched the confirmed sponsorship rules for that month.`;
  }
  return "No qualified sponsorship activity matches the selected filters.";
}

function renderFilterNotice(rows) {
  const notice = $("#filterNotice");
  if (!notice) return;
  const hasNoMatches = DATA.sponsorships.length > 0 && rows.length === 0;
  notice.hidden = !hasNoMatches;
  notice.textContent = hasNoMatches ? emptyFilterMessage() : "";
}

function renderEmpty(message) {
  $("#kpis").innerHTML = `<div class="panel" style="grid-column:1/-1"><h2>No verified dataset available</h2><p class="sub">${escapeHtml(message)}</p></div>`;
  $("#bars").textContent = "No verified data";
  $("#types").textContent = "No verified data";
  $("#coverage").textContent = "No verified data";
  $("#reviewPreview").textContent = "No verified data";
  $("#registerBody").innerHTML = "";
  $("#acctBody").innerHTML = "";
  $("#exceptionCards").innerHTML = "";
}

function renderKpis(rows) {
  const orderCount = new Set(rows.map(orderKey).filter(Boolean)).size;
  const units = rows.reduce((total, row) => total + number(row.quantity), 0);
  const retail = rows.reduce((total, row) => total + number(row.retail_value), 0);
  const netSales = rows.reduce((total, row) => total + number(row.net_sales), 0);
  const costRows = rows.filter(row => hasNumber(row.current_unit_cost));
  const cogs = costRows.reduce((total, row) => total + number(row.current_unit_cost) * number(row.quantity), 0);
  const coverage = rows.length ? `${((costRows.length / rows.length) * 100).toFixed(1)}%` : "—";

  $("#kpis").innerHTML = [
    ["Qualified orders", orderCount],
    ["Qualified units", units],
    ["Gross merchandise value", money(retail)],
    ["Net sales", money(netSales)],
    ["Current COGS", money(cogs)],
    ["COGS coverage", coverage],
  ].map(([label, value]) => `<div class="kpi"><div class="label">${label}</div><div class="value">${value}</div></div>`).join("");
}

function renderCharts(rows) {
  const months = new Map();
  const types = new Map();
  for (const row of rows) {
    const month = sourceDate(row.created_at).slice(0, 7) || "Unknown";
    months.set(month, (months.get(month) || 0) + number(row.retail_value));
    types.set(row.type || "Unspecified", (types.get(row.type || "Unspecified") || 0) + 1);
  }
  const maximum = Math.max(...months.values(), 1);
  $("#bars").innerHTML = [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, value]) => `
    <div class="chart-row"><div>${escapeHtml(month)}</div><div class="bar-track"><div class="bar-fill" style="width:${(value / maximum) * 100}%"></div></div><div>${money(value)}</div></div>
  `).join("") || emptyFilterMessage();
  $("#types").innerHTML = [...types.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([type, count]) => `
    <div class="type-row"><span>${escapeHtml(type)}</span><strong>${count} lines</strong></div>
  `).join("") || emptyFilterMessage();
}

function renderCoverage(rows) {
  const source = DATA.meta || {};
  const exactCosts = rows.filter(row => hasNumber(row.current_unit_cost)).length;
  const values = [
    ["Generated", source.generated_at ? new Date(source.generated_at).toLocaleString() : "Unknown"],
    ["Shopify orders scanned", source.orders_scanned ?? "—"],
    ["Qualified line items", rows.length],
    ["Lines with current cost", `${exactCosts} / ${rows.length}`],
    ["Excluded canceled/test", source.excluded_orders ?? "—"],
    ["Review queue", DATA.reviewQueue.length],
  ];
  $("#coverage").innerHTML = values.map(([label, value]) => `<article class="cover-card"><div class="label">${escapeHtml(label)}</div><strong>${escapeHtml(value)}</strong></article>`).join("");
}

function renderRegister(rows) {
  $("#registerBody").innerHTML = rows.map(row => {
    const currentCost = hasNumber(row.current_unit_cost) ? money(number(row.current_unit_cost) * number(row.quantity)) : "—";
    const costStatus = hasNumber(row.current_unit_cost) ? "Current Shopify cost" : "Cost unavailable";
    const evidence = row.evidence ? `${row.evidence.field}: ${row.evidence.text}` : "—";
    return `<tr>
      <td>${escapeHtml(sourceDate(row.created_at))}</td>
      <td>${escapeHtml(row.order_name || row.order_id)}</td>
      <td>${escapeHtml(row.customer || "—")}</td>
      <td>${escapeHtml(row.product_title || "—")}<br><small>${escapeHtml(row.sku || "No SKU")}</small></td>
      <td>${number(row.quantity)}</td>
      <td>${money(row.retail_value)}</td>
      <td>${currentCost}</td>
      <td>${money(row.net_sales)}</td>
      <td>${badge(costStatus)}</td>
      <td>${escapeHtml(evidence)}</td>
      <td>${badge(row.type)}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="11">${escapeHtml(emptyFilterMessage())}</td></tr>`;
}

function accountingValue(row) {
  return row.Amount ?? row.amount ?? row.value ?? row.total ?? row.Total ?? row["Paid Amount"];
}

function renderAccounting() {
  const accounting = Array.isArray(DATA.accounting) ? DATA.accounting : [];
  $("#acctKpis").innerHTML = [
    ["Accounting rows", accounting.length],
    ["Imported amount", money(accounting.reduce((total, row) => total + number(accountingValue(row)), 0))],
  ].map(([label, value]) => `<div class="kpi"><div class="label">${label}</div><div class="value">${value}</div></div>`).join("");
  $("#acctBody").innerHTML = accounting.slice(0, 500).map(row => `<tr>
    <td>${escapeHtml(row.Date || row.date || row["Txn Date"] || "")}</td>
    <td>${escapeHtml(row.Vendor || row.vendor || row.Name || "")}</td>
    <td>${escapeHtml(row.Transaction || row.transaction || row.Type || "")}</td>
    <td>${escapeHtml(row.Account || row.account || "")}</td>
    <td>${escapeHtml(row.Memo || row.memo || row.ref || row["Memo/Description"] || "—")}</td>
    <td>${money(accountingValue(row))}</td>
    <td>${escapeHtml(row.Linked || row.linked || row.shopify_id || row.Num || "—")}</td>
    <td>${badge(row.Status || row.status || "Not linked")}</td>
  </tr>`).join("") || `<tr><td colspan="8">No QuickBooks rows were imported. This does not affect Shopify sponsorship totals.</td></tr>`;
}

function reviewText(item) {
  const order = item.order_name || item.order_id || "Unknown order";
  const evidence = item.review_reason || "Manual classification required";
  return `<article class="exception"><h3>${escapeHtml(order)}</h3><p>${escapeHtml(evidence)}</p><small>${escapeHtml(item.store || "Shopify")}</small></article>`;
}

function renderReview() {
  const items = DATA.reviewQueue || [];
  $("#reviewCount").textContent = `${items.length} items`;
  $("#reviewPreview").innerHTML = items.slice(0, 3).map(reviewText).join("") || "No ambiguous zero-value or candidate orders were found.";
  $("#exceptionCards").innerHTML = items.map(reviewText).join("") || "No records require classification review.";
}

function render() {
  if (LOAD_ERROR) {
    renderEmpty(LOAD_ERROR);
    return;
  }
  const rows = rowsForFilters();
  renderFilterNotice(rows);
  renderKpis(rows);
  renderCharts(rows);
  renderCoverage(rows);
  renderRegister(rows);
  renderAccounting();
  renderReview();
}

function refreshFilters() {
  const sourceMonths = DATA.sponsorships.map(row => sourceDate(row.created_at).slice(0, 7)).filter(Boolean).sort();
  const startValue = DATA.meta?.start_date || sourceMonths[0];
  const endValue = DATA.meta?.generated_at || sourceMonths.at(-1);
  const start = new Date(`${String(startValue || "").slice(0, 7)}-01T00:00:00Z`);
  const end = new Date(`${String(endValue || "").slice(0, 7)}-01T00:00:00Z`);
  const months = [];
  if (!Number.isNaN(start.valueOf()) && !Number.isNaN(end.valueOf()) && start <= end) {
    for (const cursor = new Date(start); cursor <= end; cursor.setUTCMonth(cursor.getUTCMonth() + 1)) {
      months.push(cursor.toISOString().slice(0, 7));
    }
  } else {
    months.push(...new Set(sourceMonths));
  }
  const types = [...new Set(DATA.sponsorships.map(row => row.type).filter(Boolean))].sort();
  $("#month").innerHTML = `<option value="all">All months</option>${months.map(month => `<option value="${escapeHtml(month)}">${escapeHtml(monthLabel(month))}</option>`).join("")}`;
  $("#type").innerHTML = `<option value="all">All types</option>${types.map(type => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join("")}`;
}

function exportCsv() {
  const headers = ["Store", "Order", "Created at", "Customer", "Product", "SKU", "Quantity", "Gross merchandise value", "Net sales", "Current unit cost", "Type", "Evidence field", "Evidence text"];
  const quote = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const lines = rowsForFilters().map(row => [row.store, row.order_name || row.order_id, row.created_at, row.customer, row.product_title, row.sku, row.quantity, row.retail_value, row.net_sales, row.current_unit_cost, row.type, row.evidence?.field, row.evidence?.text].map(quote).join(","));
  const blob = new Blob([[headers.map(quote).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "sponsorship-tracking-export.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

async function loadDashboard() {
  try {
    const response = await fetch("/data/dashboard.json", { cache: "no-store" });
    if (!response.ok) throw new Error(response.status === 404 ? "The live Shopify dataset has not been generated yet." : "The verified dataset could not be loaded.");
    const payload = await response.json();
    if (payload?.meta?.status !== "verified" || !Array.isArray(payload.sponsorships)) {
      throw new Error("The published file is not a verified Sponsorship Tracking dataset.");
    }
    DATA = {
      sponsorships: payload.sponsorships,
      reviewQueue: Array.isArray(payload.review_queue) ? payload.review_queue : [],
      accounting: Array.isArray(payload.accounting) ? payload.accounting : [],
      meta: payload.meta,
    };
    refreshFilters();
    setDataStatus(`Verified Shopify data - ${new Date(DATA.meta.generated_at).toLocaleDateString()}`);
  } catch (error) {
    LOAD_ERROR = error.message || "The verified dataset could not be loaded.";
    setDataStatus("No verified data", false);
  }
  render();
}

document.addEventListener("DOMContentLoaded", () => {
  $("#themeToggle")?.addEventListener("click", () => {
    document.body.dataset.theme = document.body.dataset.theme === "dark" ? "light" : "dark";
  });
  document.querySelectorAll(".nav").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll(".nav").forEach(element => element.classList.remove("active"));
    document.querySelectorAll(".view").forEach(element => element.classList.remove("active-view"));
    button.classList.add("active");
    document.getElementById(button.dataset.view)?.classList.add("active-view");
  }));
  $("#month")?.addEventListener("change", event => { FILTERS.month = event.target.value; render(); });
  $("#quarter")?.addEventListener("change", event => { FILTERS.quarter = event.target.value; render(); });
  $("#type")?.addEventListener("change", event => { FILTERS.type = event.target.value; render(); });
  $("#search")?.addEventListener("input", event => { FILTERS.search = event.target.value; render(); });
  $("#reset")?.addEventListener("click", () => {
    FILTERS = { month: "all", quarter: "all", type: "all", search: "" };
    if ($("#month")) $("#month").value = "all";
    if ($("#quarter")) $("#quarter").value = "all";
    if ($("#type")) $("#type").value = "all";
    if ($("#search")) $("#search").value = "";
    render();
  });
  $("#exportBtn")?.addEventListener("click", exportCsv);
  $("#logoutBtn")?.addEventListener("click", async () => {
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    window.location.assign("/login.html");
  });
  loadDashboard();
});
