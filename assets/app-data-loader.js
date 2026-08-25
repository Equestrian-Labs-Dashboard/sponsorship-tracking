let DATA={
 sponsorships:[],
 accounting:[],
 shopify:{}
};

fetch('./data/dashboard.json')
.then(r=>{
 if(!r.ok) throw new Error("dashboard.json no encontrado");
 return r.json();
})
.then(d=>{
 DATA.shopify=d.shopify||{};
 DATA.sponsorships=d.quickbooks?.bills||[];
 DATA.accounting=[
  ...(d.quickbooks?.ledger||[]),
  ...(d.quickbooks?.transactions||[]),
  ...(d.quickbooks?.payables||[])
 ];
 console.log("Datos reales cargados",DATA);
 window.DATA=DATA;
 if(window.render) window.render();
})
.catch(e=>console.error(e));
