let DATA={};

document.addEventListener('dashboard-loaded',e=>{DATA=e.detail; render();});

function rows(){return DATA.sponsorships||[]}
function money(v){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v||0)}
function render(){
 const r=rows();
 const k=document.querySelector('#kpis');
 if(k) k.innerHTML=[['Sponsorships',r.length],['Retail',money(r.reduce((a,x)=>a+x.retail,0))],['Cost',money(r.reduce((a,x)=>a+x.cost,0))],['Review',r.filter(x=>x.match!=='Matched').length]].map(x=>`<div class="kpi"><b>${x[1]}</b><span>${x[0]}</span></div>`).join('');
 const bars=document.querySelector('#bars');
 if(bars){let m={};r.forEach(x=>{let d=(x.date||'').slice(0,7)||'Unknown';m[d]=(m[d]||0)+1});bars.innerHTML=Object.entries(m).map(([a,b])=>`<div class="bar-row"><span>${a}</span><div><i style="width:${Math.min(100,b*12)}%"></i></div><b>${b}</b></div>`).join('')||'<p>No data</p>';}
 const types=document.querySelector('#types');
 if(types){let t={};r.forEach(x=>t[x.type]=(t[x.type]||0)+1);types.innerHTML=Object.entries(t).map(x=>`<p>${x[0]} <strong>${x[1]}</strong></p>`).join('')||'<p>No data</p>';}
 const body=document.querySelector('#registerBody');
 if(body) body.innerHTML=r.map(x=>`<tr><td>${x.date}</td><td>${x.order}</td><td>${x.recipient}</td><td>${x.product}</td><td>${x.qty}</td><td>${money(x.retail)}</td><td>${money(x.cost)}</td><td>${x.type}</td><td>${x.detectedBy}</td></tr>`).join('');
}

document.addEventListener('click',e=>{if(e.target.id==='themeToggle')document.body.classList.toggle('dark');});
