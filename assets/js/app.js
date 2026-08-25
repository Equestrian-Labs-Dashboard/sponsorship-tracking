async function load(){
let d={};
try{
 const r=await fetch('data/dashboard.json?'+Date.now());
 d=await r.json();
}catch(e){console.error(e)}
const sponsors=d.sponsorships || d.shopify?.sponsorships || d.shopify?.corro || [];
const accounting=d.accounting || d.quickbooks?.transactions || d.quickbooks?.ledger || [];
document.querySelector('#status').textContent=`Loaded ${sponsors.length} sponsorship records and ${accounting.length} accounting records`;
const k=document.querySelector('#kpis');
k.innerHTML=`
<div class="card">Sponsorships<br><b>${sponsors.length}</b></div>
<div class="card">Accounting Records<br><b>${accounting.length}</b></div>
<div class="card">Total Value<br><b>${money(sponsors.reduce((a,x)=>a+num(x.retail||x.value||x.amount),0))}</b></div>`;
const months={}; const types={};
sponsors.forEach(x=>{let m=(x.date||'').slice(0,7)||'Unknown'; months[m]=(months[m]||0)+1; let t=x.type||'Other'; types[t]=(types[t]||0)+1});
bars('#monthly',months); bars('#types',types);
document.querySelector('#rows').innerHTML=sponsors.slice(0,100).map(x=>`<tr><td>${x.date||''}</td><td>${x.recipient||x.vendor||''}</td><td>${x.product||''}</td><td>${x.type||''}</td><td>${money(x.retail||x.value||0)}</td></tr>`).join('');
}
function num(x){return Number(x)||0} function money(x){return '$'+num(x).toLocaleString()}
function bars(sel,obj){document.querySelector(sel).innerHTML=Object.entries(obj).map(([k,v])=>`<div>${k}: ${v}</div><div class="bar" style="width:${Math.min(100,v)}%">${v}</div>`).join('')||'No data'}
load();
