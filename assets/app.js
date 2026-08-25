let DATA = { sponsorships: [], accounting: [], raw: {} };

const $ = s => document.querySelector(s);
const money = n => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(n) || 0);

function safe(v, d = "Unknown") { return String(v ?? d); }

// Soluciona el error [object Object] extrayendo el nombre correctamente
function getCustomerName(c) {
  if (!c) return "";
  if (typeof c === 'string') return c;
  if (c.name) return c.name;
  if (c.first_name || c.last_name) return `${c.first_name || ''} ${c.last_name || ''}`.trim();
  return "Unknown";
}

// Limpia strings para que siempre se puedan sumar como números y no queden en $0
function getNum(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'string') val = val.replace(/[^0-9.-]+/g,"");
  return Number(val) || 0;
}

function badge(v) {
  const s = safe(v, "Pending");
  const className = s.toLowerCase().replaceAll(" ", "-");
  return `<span class="badge ${className}">${s}</span>`;
}

function normalize(d) {
  const sponsors = d.sponsorships || d.shopify?.sponsorships || d.shopify?.corro || d.shopify?.orders || [];
  const q = d.accounting || d.quickbooks?.transactions || d.quickbooks?.ledger || d.quickbooks?.bills || [];
  return {
    sponsorships: Array.isArray(sponsors) ? sponsors : [],
    accounting: Array.isArray(q) ? q : [],
    raw: d
  };
}

async function loadDashboard() {
  try {
    const r = await fetch("./data/dashboard.json?" + Date.now());
    if (!r.ok) throw Error(r.status);
    DATA = normalize(await r.json());
  } catch (e) {
    try {
      const r = await fetch("./data/mock-data.json?" + Date.now());
      DATA = normalize(await r.json());
    } catch (x) { console.error("Error cargando mock data", x) }
  }
  render();
}

function render() {
  const s = DATA.sponsorships, a = DATA.accounting;
  
  // 1. Arreglamos los cálculos numéricos en los KPIs
  if ($("#kpis")) {
    const totalRetail = s.reduce((t, x) => t + getNum(x.retail || x.value || x.amount || x.total_price), 0);
    $("#kpis").innerHTML = `
      <div class="kpi"><div class="label">Sponsorships</div><div class="value">${s.length}</div></div>
      <div class="kpi"><div class="label">Accounting</div><div class="value">${a.length}</div></div>
      <div class="kpi"><div class="label">Retail Value</div><div class="value">${money(totalRetail)}</div></div>`;
  }

  const months = {}; 
  const types = {};
  
  s.forEach(x => {
    let m = safe(x.date || x.created_at, "Unknown").slice(0, 7);
    months[m] = (months[m] || 0) + 1;
    let t = safe(x.type, "Other");
    types[t] = (types[t] || 0) + 1;
  });

  if ($("#bars")) {
    const maxVal = Math.max(...Object.values(months), 1);
    $("#bars").innerHTML = Object.entries(months).map(([k, v]) => {
      const percentage = (v / maxVal) * 100;
      return `
        <div class="chart-row">
          <div>${k}</div>
          <div class="bar-track"><div class="bar-fill" style="width: ${percentage}%"></div></div>
          <div>${v}</div>
        </div>`;
    }).join("") || "No data";
  }

  if ($("#types")) {
    $("#types").innerHTML = Object.entries(types).map(([k, v]) => `
      <div class="type-row">
        <span>${k}</span>
        <strong>${v}</strong>
      </div>`).join("") || "No data";
  }

  // 2. Arreglamos la tabla de Sponsorship Register (nombres y valores)
  if ($("#registerBody")) {
    $("#registerBody").innerHTML = s.map(x => `
      <tr>
        <td>${safe(x.date || x.created_at, "")}</td>
        <td>${safe(x.order || x.name, "")}</td>
        <td>${getCustomerName(x.recipient || x.customer)}</td>
        <td>${safe(x.product || x.sku || (x.line_items && x.line_items[0] ? x.line_items[0].name : ""), "")}</td>
        <td>${getNum(x.qty || x.quantity || 0)}</td>
        <td>${money(getNum(x.retail || x.value || x.total_price))}</td>
        <td>${money(getNum(x.cost))}</td>
        <td>${badge(x.type)}</td>
        <td>${safe(x.detected_by || x.rule, "Auto")}</td>
        <td>${badge(x.status || x.match_status)}</td>
      </tr>`).join("");
  }

  if ($("#acctBody")) {
    $("#acctBody").innerHTML = a.slice(0, 500).map(x => `
      <tr>
        <td>${safe(x.date || x.txn_date, "")}</td>
        <td>${safe(x.vendor || x.name, "")}</td>
        <td>${safe(x.transaction || x.txn, "")}</td>
        <td>${safe(x.account, "")}</td>
        <td>${safe(x.memo || x.ref, "-")}</td>
        <td>${money(getNum(x.amount || x.value || x.total))}</td>
        <td>${safe(x.linked || x.shopify_id, "-")}</td>
        <td>${badge(x.status || x.match_status)}</td>
      </tr>`).join("");
  }

  // 3. Añadimos la lógica para renderizar la Review Queue
  if ($("#exceptionCards")) {
    const reviewItems = s.filter(x => (x.status || x.match_status || "").toLowerCase().includes("review") || (x.type || "").toLowerCase().includes("pending"));
    
    if(reviewItems.length === 0) {
        $("#exceptionCards").innerHTML = `<p class="muted">No items currently require manual review.</p>`;
    } else {
        $("#exceptionCards").innerHTML = reviewItems.map(x => `
          <div class="exception">
            <h3>Order ${safe(x.order || x.name)}</h3>
            <p>Needs review for: <b>${safe(x.type, "Classification")}</b></p>
            <small>Detected: ${safe(x.detected_by || x.rule, "Auto")}</small>
          </div>
        `).join("");
    }
    
    if ($("#reviewCount")) {
        $("#reviewCount").innerText = reviewItems.length + " items";
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const themeToggleBtn = document.getElementById("themeToggle");
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      document.body.dataset.theme = document.body.dataset.theme === "dark" ? "light" : "dark";
    });
  }

  document.querySelectorAll(".nav").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav").forEach(x => x.classList.remove("active"));
      document.querySelectorAll(".view").forEach(x => x.classList.remove("active-view"));
      
      btn.classList.add("active");
      const targetView = document.getElementById(btn.dataset.view);
      if (targetView) {
        targetView.classList.add("active-view");
      }
    });
  });

  loadDashboard();
});
