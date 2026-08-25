
let DATA={sponsorships:[],accounting:[],raw:{}};
const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(n)||0);

function safe(v,d="Unknown"){return String(v ?? d);}
function badge(v){
 const s=safe(v,"Pending");
 return `<span class="badge ${s.toLowerCase().replaceAll(" ","-")}">${s}</span>`;
}

function normalize(d){
 const sponsors=d.sponsorships || d.shopify?.sponsorships || d.shopify?.corro || d.shopify?.orders || [];
 const q=d.accounting || d.quickbooks?.transactions || d.quickbooks?.ledger || d.quickbooks?.bills || [];
 return {
  sponsorships:Array.isArray(sponsors)?sponsors:[],
  accounting:Array.isArray(q)?q:[],
  raw:d
 };
}

async function loadDashboard(){
 try{
  const r=await fetch("./data/dashboard.json?"+Date.now());
  if(!r.ok) throw Error(r.status);
  DATA=normalize(await r.json());
 }catch(e){
  console.error("dashboard.json error",e);
  try{
   const r=await fetch("./data/mock-data.json?"+Date.now());
   DATA=normalize(await r.json());
  }catch(x){console.error(x)}
 }
 render();
}

function render(){
 const s=DATA.sponsorships,a=DATA.accounting;
 if($("#kpis")) $("#kpis").innerHTML=`
 <div class="card">Sponsorships<br><b>${s.length}</b></div>
 <div class="card">Accounting<br><b>${a.length}</b></div>
 <div class="card">Retail Value<br><b>${money(s.reduce((t,x)=>t+Number(x.retail||x.value||x.amount||0),0))}</b></div>`;

 const months={}; const types={};
 s.forEach(x=>{
  let m=safe(x.date||x.created_at,"Unknown").slice(0,7);
  months[m]=(months[m]||0)+1;
  let t=safe(x.type,"Other");
  types[t]=(types[t]||0)+1;
 });
 if($("#bars")) $("#bars").innerHTML=Object.entries(months).map(([k,v])=>`${k}: ${"█".repeat(Math.min(v,20))} ${v}`).join("<br>")||"No data";
 if($("#types")) $("#types").innerHTML=Object.entries(types).map(([k,v])=>`${k}: ${v}`).join("<br>")||"No data";

 if($("#registerBody")) $("#registerBody").innerHTML=s.map(x=>`
 <tr>
 <td>${safe(x.date||x.created_at,"")}</td>
 <td>${safe(x.order||x.name,"")}</td>
 <td>${safe(x.recipient||x.customer,"")}</td>
 <td>${safe(x.product||x.sku,"")}</td>
 <td>${safe(x.qty||x.quantity,0)}</td>
 <td>${money(x.retail||x.value||0)}</td>
 <td>${badge(x.type)}</td>
 <td>${badge(x.status||x.match_status)}</td>
 </tr>`).join("");

 if($("#acctBody")) $("#acctBody").innerHTML=a.slice(0,500).map(x=>`
 <tr>
 <td>${safe(x.date||x.txn_date,"")}</td>
 <td>${safe(x.vendor||x.name,"")}</td>
 <td>${safe(x.transaction||x.txn,"")}</td>
 <td>${safe(x.account,"")}</td>
 <td>${money(x.amount||x.value||x.total||0)}</td>
 <td>${badge(x.status||x.match_status)}</td>
 </tr>`).join("");
}

document.addEventListener("DOMContentLoaded",()=>{
 $("#themeToggle")?.addEventListener("click",()=>document.body.dataset.theme=document.body.dataset.theme==="dark"?"light":"dark");
 loadDashboard();
});
