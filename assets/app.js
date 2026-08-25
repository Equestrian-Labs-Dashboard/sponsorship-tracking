let DATA = { sponsorships: [], accounting: [], raw: {} };

const $ = s => document.querySelector(s);
const money = n => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(n) || 0);

function safe(v, d = "Unknown") { return String(v ?? d); }

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
    console.warn("No se encontró dashboard.json, cargando datos simulados", e);
    try {
      const r = await fetch("./data/mock-data.json?" + Date.now());
      DATA = normalize(await r.json());
    } catch (x) { console.error("Error cargando mock data", x) }
  }
  render();
}

function render() {
  const s = DATA.sponsorships, a = DATA.accounting;
  
  if ($("#kpis")) {
    $("#kpis").innerHTML = `
      <div class="kpi"><div class="label">Sponsorships</div><div class="value">${s.length}</div></div>
      <div class="kpi"><div class="label">Accounting</div><div class="value">${a.length}</div></div>
      <div class="kpi"><div class="label">Retail Value</div><div class="value">${money(s.reduce((t, x) => t + Number(x.retail || x.value || x.amount || 0), 0))}</div></div>`;
  }

  const months = {}; 
  const types = {};
  
  s.forEach(x => {
    let m = safe(x.date || x.created_at, "Unknown").slice(0, 7);
    months[m] = (months[m] || 0) + 1;
    let t = safe(x.type, "Other");
    types[t] = (types[t] || 0) + 1;
  });

  // Dibujar barras dinámicas usando HTML y clases CSS
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

  // Dibujar categorías
  if ($("#types")) {
    $("#types").innerHTML = Object.entries(types).map(([k, v]) => `
      <div class="type-row">
        <span>${k}</span>
        <strong>${v}</strong>
      </div>`).join("") || "No data";
  }

  // Renderizar la tabla de Sponsorships
  if ($("#registerBody")) {
    $("#registerBody").innerHTML = s.map(x => `
      <tr>
        <td>${safe(x.date || x.created_at, "")}</td>
        <td>${safe(x.order || x.name, "")}</td>
        <td>${safe(x.recipient || x.customer, "")}</td>
        <td>${safe(x.product || x.sku, "")}</td>
        <td>${safe(x.qty || x.quantity, 0)}</td>
        <td>${money(x.retail || x.value || 0)}</td>
        <td>${money(x.cost || 0)}</td>
        <td>${badge(x.type)}</td>
        <td>${safe(x.detected_by || x.rule, "Auto")}</td>
        <td>${badge(x.status || x.match_status)}</td>
      </tr>`).join("");
  }

  // Renderizar la tabla de Accounting
  if ($("#acctBody")) {
    $("#acctBody").innerHTML = a.slice(0, 500).map(x => `
      <tr>
        <td>${safe(x.date || x.txn_date, "")}</td>
        <td>${safe(x.vendor || x.name, "")}</td>
        <td>${safe(x.transaction || x.txn, "")}</td>
        <td>${safe(x.account, "")}</td>
        <td>${safe(x.memo || x.ref, "-")}</td>
        <td>${money(x.amount || x.value || x.total || 0)}</td>
        <td>${safe(x.linked || x.shopify_id, "-")}</td>
        <td>${badge(x.status || x.match_status)}</td>
      </tr>`).join("");
  }
}

// Envuelve todo en DOMContentLoaded para que los menús no fallen al inicio
document.addEventListener("DOMContentLoaded", () => {
  const themeToggleBtn = document.getElementById("themeToggle");
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      document.body.dataset.theme = document.body.dataset.theme === "dark" ? "light" : "dark";
    });
  }

  // Navegación corregida: ahora se inicializa correctamente al cargar
  document.querySelectorAll(".nav").forEach(btn => {
    btn.addEventListener("click", () => {
      // Remover clase active de todos los botones y vistas
      document.querySelectorAll(".nav").forEach(x => x.classList.remove("active"));
      document.querySelectorAll(".view").forEach(x => x.classList.remove("active-view"));
      
      // Añadir clase active al botón actual y a la vista objetivo
      btn.classList.add("active");
      const targetView = document.getElementById(btn.dataset.view);
      if (targetView) {
        targetView.classList.add("active-view");
      }
    });
  });

  loadDashboard();
});
