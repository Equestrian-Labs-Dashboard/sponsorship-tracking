window.DATA = {
  sponsorships: [],
  accounting: [],
  shopify: {}
};

fetch("./data/dashboard.json")
.then(response => {
  if (!response.ok) {
    throw new Error("No existe data/dashboard.json");
  }
  return response.json();
})
.then(data => {
  window.DATA.shopify = data.shopify || {};
  window.DATA.sponsorships = data.quickbooks?.bills || [];
  window.DATA.accounting = [
    ...(data.quickbooks?.ledger || []),
    ...(data.quickbooks?.transactions || []),
    ...(data.quickbooks?.payables || [])
  ];

  console.log("Datos reales cargados", window.DATA);

  if (typeof window.render === "function") {
    window.render();
  }
})
.catch(error => console.error("Error dashboard:", error));
