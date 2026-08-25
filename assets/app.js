
let DATA={sponsorships:[],accounting:[],raw:{}};
const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(n)||0);
const safe=(v,d="")=>String(v ?? d);
function badge(v){
 const s=safe(v,"Pending");
 return `<span class="badge ${s.toLowerCase().replaceAll(" ","-")}">${s}</span>`;
}
function normalize(d){
 const shop=d.shopify||{};
 const qb=d.quickbooks||{};
 const sponsors=d.sponsorships||shop.sponsorships||shop.orders||shop.corro||[];
 const accounting=d.accounting||qb.transactions||qb.ledger||qb.bills||[];
 return {sponsorships:Array.isArray(sponsors)?sponsors:[],accounting:Array.isArray(accounting)?accounting:[],raw:d};
}
async function loadDashboard(){
 try{
  const r=await fetch("./data/dashboard.json?"+Date.now());
  if(!r.ok) throw Error(r.status);
  DATA=normalize(await r.json());
 }catch(e){
  console.warn("dashboard.json unavailable",e);
  try{
   const r=await fetch("./data/mock-data.json?"+Date.now());
   DATA=normalize(await r.json());
  }catch(x){DATA={sponsorships:[],accounting:[],raw:{}}}
 }
 render();
}
function setViews(){
 document.querySelectorAll(".nav").forEach(btn=>{
  btn.onclick=()=>{
   document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));
   btn.classList.add("active");
   document.querySelectorAll(".view").forEach(v=>v.classList.remove("active-view"));
   document.getElementById(btn.dataset.view)?.classList.add("active-view");
  };
 });
}
function render(){
 const s=DATA.sponsorships,a=DATA.accounting;
 $("#kpis") && ($("#kpis").innerHTML=`
 <div class="card">Sponsorships<br><b>${s.length}</b></div>
 <div class="card">Accounting<br><b>${a.length}</b></div>
 <div class="card">Retail Value<br><b>${money(s.reduce((t,x)=>t+Number(x.retail||x.value||x.amount||0),0))}</b></div>`);
 const months={2026:{}},types={};
 s.forEach(x=>{
  const d=safe(x.date||x.created_at);
  if(d.startsWith("2026")){
   const m=d.slice(0,7); months[2026][m]=(months[2026][m]||0)+1;
  }
  const t=safe(x.type,"Other"); types[t]=(types[t]||0)+1;
 });
 $("#bars")&&($("#bars").innerHTML=Object.entries(months[2026]).map(([k,v])=>`<div class="bar-row"><span>${k}</span><div class="bar" style="width:${v*35}px"></div><b>${v}</b></div>`).join("")||"No activity 2026");
 $("#types")&&($("#types").innerHTML=Object.entries(types).map(([k,v])=>`${k}: ${v}`).join("<br>")||"No data");
 $("#registerBody")&&($("#registerBody").innerHTML=s.map(x=>`<tr><td>${safe(x.date||x.created_at)}</td><td>${safe(x.order||x.name)}</td><td>${safe(x.recipient||x.customer)}</td><td>${safe(x.product||x.sku)}</td><td>${safe(x.qty||x.quantity)}</td><td>${money(x.retail||x.value)}</td><td>${badge(x.type)}</td><td>${badge(x.status||x.match_status)}</td></tr>`).join(""));
 $("#acctBody")&&($("#acctBody").innerHTML=a.slice(0,500).map(x=>`<tr><td>${safe(x.date||x.txn_date)}</td><td>${safe(x.vendor||x.name)}</td><td>${safe(x.transaction||x.txn)}</td><td>${safe(x.account)}</td><td>${money(x.amount||x.value||x.total)}</td><td>${badge(x.status||x.match_status)}</td></tr>`).join(""));
}
document.addEventListener("DOMContentLoaded",()=>{setViews();$("#themeToggle")?.addEventListener("click",()=>document.body.dataset.theme=document.body.dataset.theme==="dark"?"light":"dark");loadDashboard();});
