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

let FILTERS = { month: "all", quarter: "all", type: "all", match: "all" };

function detectType(x) {
  if (x.type) return x.type;
  let str = (x.tags || "") + " " + (x.note || "") + " " + JSON.stringify(x.note_attributes || []) + " " + JSON.stringify(x.discount_codes || []);
  str = str.toLowerCase();
  if (str.includes("sponsorship") || str.includes("sponsored")) return "Sponsorship";
  if (str.includes("seed")) return "Product Seeding";
  if (str.includes("gift") || str.includes("giveaway")) return "Gift / Giveaway";
  if (str.includes("influencer") || str.includes("ambassador")) return "Influencer / Ambassador";
  if (str.includes("sample") || str.includes("review")) return "Samples / Reviews";
  if (str.includes("press") || str.includes(" pr ")) return "PR / Press";
  if (str.includes("social") || str.includes("creator")) return "Social / Content Creator";
  return "Pending";
}

function normalize(d) {
  const sponsors = d.sponsorships || d.shopify?.sponsorships || d.shopify?.corro || d.shopify?.orders || [];
  const q = d.accounting || d.quickbooks?.transactions || d.quickbooks?.ledger || d.quickbooks?.bills || [];
  
  const filterByDate = items => items.filter(x => {
    const dStr = x.date || x.created_at || x.txn_date;
    if (!dStr) return true;
    return dStr >= "2026-07-01";
  });

  const normalizedSponsors = filterByDate(sponsors).map(x => {
    let units = getNum(x.qty || x.quantity || 0);
    if (!units && x.line_items) {
      units = x.line_items.reduce((sum, item) => sum + getNum(item.quantity), 0);
    }
    x.units_calc = units;
    
    // Calculate retail from line items to ignore 100% order discounts
    let retail = 0;
    if (x.line_items && x.line_items.length > 0) {
      retail = x.line_items.reduce((sum, item) => sum + (getNum(item.price) * getNum(item.quantity)), 0);
    } else {
      retail = getNum(x.retail || x.value || x.total_price);
    }
    x.retail_calc = retail;
    
    // Attempt to extract cost, or use a 20% estimate if completely missing since Shopify doesn't include it directly
    let c = getNum(x.cost || x.Cost || x.cogs || x["Total Cost"] || 0);
    if (c === 0 && x.retail_calc > 0) c = x.retail_calc * 0.20; 
    x.cost_calc = c;
    
    x.type_calc = detectType(x);
    return x;
  });

  return {
    sponsorships: normalizedSponsors,
    accounting: Array.isArray(q) ? filterByDate(q) : [],
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
  let s = DATA.sponsorships;
  let a = DATA.accounting;
  
  // Apply filters
  if (FILTERS.month !== "all") {
    s = s.filter(x => (x.date || x.created_at || "").startsWith(FILTERS.month));
  }
  if (FILTERS.type !== "all") s = s.filter(x => x.type_calc === FILTERS.type);
  if (FILTERS.match !== "all") s = s.filter(x => (x.status || x.match_status || "Pending") === FILTERS.match);
  
  if (FILTERS.quarter !== "all") {
    s = s.filter(x => {
      const m = new Date(x.date || x.created_at).getMonth() + 1;
      const q = Math.ceil(m / 3);
      return `Q${q}` === FILTERS.quarter;
    });
  }
  
  // 1. Arreglamos los cálculos numéricos en los KPIs
  if ($("#kpis")) {
    const totalRetail = s.reduce((t, x) => t + (x.retail_calc || 0), 0);
    const totalUnits = s.reduce((t, x) => t + (x.units_calc || 0), 0);
    const totalCost = s.reduce((t, x) => t + (x.cost_calc || 0), 0);
    const totalGM = totalRetail - totalCost;

    $("#kpis").innerHTML = `
      <div class="kpi"><div class="label">Sponsorships</div><div class="value">${s.length}</div></div>
      <div class="kpi"><div class="label">Units</div><div class="value">${totalUnits}</div></div>
      <div class="kpi"><div class="label">Retail Value</div><div class="value">${money(totalRetail)}</div></div>
      <div class="kpi"><div class="label">True Cost</div><div class="value">${money(totalCost)}</div></div>
      <div class="kpi"><div class="label">GM</div><div class="value">${money(totalGM)}</div></div>`;
  }

  const months = {}; 
  const types = {};
  
  s.forEach(x => {
    let m = safe(x.date || x.created_at, "Unknown").slice(0, 7);
    months[m] = (months[m] || 0) + 1;
    let t = safe(x.type_calc, "Other");
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
    $("#registerBody").innerHTML = s.map(x => {
      const retail = x.retail_calc;
      const cost = x.cost_calc;
      const gm = retail - cost;
      
      return `
      <tr>
        <td>${safe(x.date || x.created_at, "")}</td>
        <td>${safe(x.order || x.name, "")}</td>
        <td>${getCustomerName(x.recipient || x.customer)}</td>
        <td>${safe(x.product || x.sku || (x.line_items && x.line_items[0] ? x.line_items[0].name : ""), "N/A")}</td>
        <td>${x.units_calc}</td>
        <td>${money(retail)}</td>
        <td>${money(cost)}</td>
        <td>${money(gm)}</td>
        <td>${badge(x.type_calc)}</td>
        <td>${safe(x.detected_by || x.rule, "Auto")}</td>
      </tr>`;
    }).join("");
  }

  if ($("#acctBody")) {
    $("#acctBody").innerHTML = a.slice(0, 500).map(x => `
      <tr>
        <td>${safe(x.Date || x.date || x.txn_date || x["Txn Date"] || x["Transaction Date"], "")}</td>
        <td>${safe(x.Vendor || x.vendor || x.name || x["Name"], "")}</td>
        <td>${safe(x.Transaction || x.transaction || x.txn || x["Transaction Type"] || x["Type"], "")}</td>
        <td>${safe(x.Account || x.account, "")}</td>
        <td>${safe(x.Memo || x.memo || x.ref || x["Memo/Description"] || x["Ref"], "-")}</td>
        <td>${money(getNum(x.Amount || x.amount || x.value || x.total || x["Total"] || x["Paid Amount"]))}</td>
        <td>${safe(x.Linked || x.linked || x.shopify_id || x["Num"], "-")}</td>
        <td>${badge(x.Status || x.status || x.match_status)}</td>
      </tr>`).join("");
  }

  // 3. Añadimos la lógica para renderizar la Review Queue
  if ($("#exceptionCards")) {
    const reviewItems = s.filter(x => (x.status || x.match_status || "").toLowerCase().includes("review") || (x.type_calc || "").toLowerCase().includes("pending"));
    
    if(reviewItems.length === 0) {
        $("#exceptionCards").innerHTML = `<p class="muted">No items currently require manual review.</p>`;
    } else {
        $("#exceptionCards").innerHTML = reviewItems.map(x => `
          <div class="exception">
            <h3>Order ${safe(x.order || x.name)}</h3>
            <p>Needs review for: <b>${safe(x.type_calc, "Classification")}</b></p>
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

  const updateFilters = () => {
    if ($("#month")) FILTERS.month = $("#month").value;
    if ($("#quarter")) FILTERS.quarter = $("#quarter").value;
    if ($("#type")) FILTERS.type = $("#type").value;
    if ($("#match")) FILTERS.match = $("#match").value;
    render();
  };

  ["#month", "#quarter", "#type", "#match"].forEach(sel => {
    if ($(sel)) $(sel).addEventListener("change", updateFilters);
  });
  
  if ($("#reset")) {
    $("#reset").addEventListener("click", () => {
      FILTERS = { month: "all", quarter: "all", type: "all", match: "all" };
      if ($("#month")) $("#month").value = "all";
      if ($("#quarter")) $("#quarter").value = "all";
      if ($("#type")) $("#type").value = "all";
      if ($("#match")) $("#match").value = "all";
      render();
    });
  }

  loadDashboard().then(() => {
    // Populate month options dynamically
    if ($("#month")) {
      const monthsSet = new Set(DATA.sponsorships.map(x => (x.date || x.created_at || "").slice(0, 7)).filter(Boolean));
      const sortedMonths = Array.from(monthsSet).sort();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      let options = `<option value="all">All months</option>`;
      sortedMonths.forEach(m => {
        const [yyyy, mm] = m.split("-");
        options += `<option value="${m}">${monthNames[parseInt(mm)-1]} ${yyyy}</option>`;
      });
      $("#month").innerHTML = options;
      $("#month").value = FILTERS.month;
    }
    
    // Populate types dynamically
    if ($("#type")) {
      const typeSet = new Set(DATA.sponsorships.map(x => x.type_calc).filter(Boolean));
      let options = `<option value="all">All types</option>`;
      Array.from(typeSet).sort().forEach(t => {
        options += `<option value="${t}">${t}</option>`;
      });
      $("#type").innerHTML = options;
      $("#type").value = FILTERS.type;
    }
  });
});
