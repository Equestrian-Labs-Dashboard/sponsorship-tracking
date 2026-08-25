fetch('data/dashboard.json').then(r=>r.json()).then(d=>{window.REAL_DATA=d;});
let DATA={sponsorships:[],accounting:[]};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n||0);
const q=d=>`Q${Math.floor(new Date(d+'T00:00:00').getMonth()/3)+1}`;
const badge=s=>`<span class="badge ${s.toLowerCase().replaceAll(' ','-')}">${s}</span>`;

function applyTheme(theme){
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('corro_theme', theme);
  const icon = $('.theme-icon');
  const label = $('.toggle-label');
  if(icon && label){
    if(theme === 'dark'){
      icon.textContent = '☀';
      label.textContent = 'Light mode';
    }else{
      icon.textContent = '☾';
      label.textContent = 'Dark mode';
    }
  }
}

function initTheme(){
  const saved=localStorage.getItem('corro_theme');
  if(saved==='dark' || saved==='light') return applyTheme(saved);
  const prefersDark=window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
}

function filtered(){
  let rows=DATA.sponsorships;
  const f=$('#from').value,t=$('#to').value,qq=$('#quarter').value,ty=$('#type').value,m=$('#match').value;
  return rows.filter(r=>(!f||r.date>=f)&&(!t||r.date<=t)&&(qq==='all'||q(r.date)===qq)&&(ty==='all'||r.type===ty)&&(m==='all'||r.match===m));
}

function render(){
  const rows=filtered();
  const orders=new Set(rows.map(r=>r.order)).size,
        units=rows.reduce((a,r)=>a+r.qty,0),
        retail=rows.reduce((a,r)=>a+r.retail,0),
        cost=rows.reduce((a,r)=>a+r.cost,0),
        recips=new Set(rows.map(r=>r.recipient)).size;

  $('#kpis').innerHTML=[
    ['Sponsorship Orders',orders,'Unique Shopify orders'],
    ['Sponsored Units',units,'Detected sponsored units'],
    ['Retail Value',money(retail),'Retail value from Shopify items'],
    ['Product Cost',money(cost),'Inventory cost basis when available'],
    ['Recipients',recips,'Unique recipients / customers']
  ].map(x=>`<div class="kpi"><div class="label">${x[0]}</div><div class="value">${x[1]}</div><div class="hint">${x[2]}</div></div>`).join('');

  const months={};
  rows.forEach(r=>{const k=r.date.slice(0,7);months[k]=(months[k]||0)+r.retail});
  const max=Math.max(...Object.values(months),1);
  $('#bars').innerHTML=Object.entries(months).map(([m,v])=>`<div class="bar-wrap"><div class="bar" data-value="${money(v)}" style="height:${Math.max(8,v/max*100)}%"></div><div class="bar-label">${new Date(m+'-01T00:00:00').toLocaleString('en',{month:'short'})}</div></div>`).join('') || '<p class="muted">No activity for current filters.</p>';

  const types={};
  rows.forEach(r=>types[r.type]=(types[r.type]||0)+r.retail);
  const tmax=Math.max(...Object.values(types),1);
  $('#types').innerHTML=Object.entries(types).sort((a,b)=>b[1]-a[1]).map(([t,v])=>`<div class="type-row"><span>${t}</span><div class="track"><i style="width:${v/tmax*100}%"></i></div><b>${money(v)}</b></div>`).join('') || '<p class="muted">No activity for current filters.</p>';

  const matched=rows.filter(r=>r.match==='Matched').length,
        review=rows.filter(r=>r.match==='Needs Review').length,
        sh=rows.filter(r=>r.match==='Shopify Only').length;
  $('#coverage').innerHTML=`
    <div class="cover-card"><b>${matched}</b><span>Matched to QB evidence</span></div>
    <div class="cover-card"><b>${review}</b><span>Needs review</span></div>
    <div class="cover-card"><b>${sh}</b><span>Shopify only</span></div>`;

  $('#reviewCount').textContent=`${review} records`;
  $('#reviewPreview').innerHTML=rows.filter(r=>r.match!=='Matched').slice(0,4).map(r=>`<div class="mini-review"><div><b>${r.order}</b> · ${r.recipient}<br><span class="muted">${r.detectedBy}</span></div>${badge(r.match)}</div>`).join('') || '<span class="muted">No items require attention.</span>';

  renderRegister(rows);
  renderAccounting();
  renderExceptions(rows);
}

function renderRegister(rows){
  const s=($('#search')?.value||'').toLowerCase();
  rows=rows.filter(r=>JSON.stringify(r).toLowerCase().includes(s));
  $('#registerBody').innerHTML=rows.length ? rows.map(r=>`<tr><td>${r.date}</td><td><b>${r.order}</b></td><td>${r.recipient}</td><td>${r.product}<br><span class="muted">${r.sku}</span></td><td>${r.qty}</td><td>${money(r.retail)}</td><td>${money(r.cost)}</td><td>${r.type}</td><td>${r.detectedBy}<br><span class="muted">Confidence: ${r.confidence}</span></td><td>${badge(r.match)}${r.qbRef?`<br><span class="muted">${r.qbRef}</span>`:''}</td></tr>`).join('') : `<tr><td colspan="10" class="muted">No rows match the current filters.</td></tr>`;
}

function renderAccounting(){
  const a=DATA.accounting;
  const total=a.reduce((x,r)=>x+r.amount,0), matched=a.filter(r=>r.status==='Matched'), unmatched=a.filter(r=>r.status!=='Matched');
  $('#acctKpis').innerHTML=[
    ['QB Evidence',a.length,'Displayed QuickBooks transactions'],
    ['Accounting Amount',money(total),'All QB rows shown'],
    ['Matched Records',matched.length,'Linked to Shopify activity'],
    ['Matched Amount',money(matched.reduce((x,r)=>x+r.amount,0)),'Reconciled evidence'],
    ['Unlinked QB',unmatched.length,'Still needs review']
  ].map(x=>`<div class="kpi"><div class="label">${x[0]}</div><div class="value">${x[1]}</div><div class="hint">${x[2]}</div></div>`).join('');

  $('#acctBody').innerHTML=a.length ? a.map(r=>`<tr><td>${r.date}</td><td>${r.vendor}</td><td>${r.txn}</td><td>${r.account}</td><td>${r.ref}</td><td>${money(r.amount)}</td><td>${r.linked||'—'}</td><td>${badge(r.status)}</td></tr>`).join('') : `<tr><td colspan="8" class="muted">No accounting rows available.</td></tr>`;
}

function renderExceptions(rows){
  const x=rows.filter(r=>r.match!=='Matched'||r.confidence!=='High');
  const qb=DATA.accounting.filter(r=>r.status==='QB Only');
  $('#exceptionCards').innerHTML=[
    ...x.map(r=>({title:`${r.order} · ${r.recipient}`,type:r.match,body:`${r.product} (${r.sku}). Detection: ${r.detectedBy}. Confidence: ${r.confidence}.`,small:'Shopify-derived record'})),
    ...qb.map(r=>({title:`${r.txn} · ${r.vendor}`,type:r.status,body:`${r.account} — ${money(r.amount)}. Reference: ${r.ref}. No Shopify order has been linked yet.`,small:'QuickBooks-derived record'}))
  ].map(r=>`<article class="exception">${badge(r.type)}<h3>${r.title}</h3><p>${r.body}</p><small>${r.small}</small></article>`).join('') || '<p class="muted">No exceptions.</p>';
}

function exportCSV(){
  const rows=filtered();
  const h=['date','order','recipient','product','sku','qty','retail','cost','type','detectedBy','match','qbRef','confidence'];
  const esc=v=>`"${String(v??'').replaceAll('"','""')}"`;
  const csv=[h.join(','),...rows.map(r=>h.map(k=>esc(r[k])).join(','))].join('\n');
  const b=new Blob([csv],{type:'text/csv'}),u=URL.createObjectURL(b),a=document.createElement('a');
  a.href=u;a.download='sponsorship-tracker.csv';a.click();URL.revokeObjectURL(u)
}

initTheme();

fetch('data/mock-data.json')
  .then(r=>r.json())
  .then(d=>{
    DATA=d;
    [...new Set(d.sponsorships.map(x=>x.type))].sort().forEach(t=>$('#type').insertAdjacentHTML('beforeend',`<option>${t}</option>`));
    render();
  });

$$('.nav').forEach(b=>b.onclick=()=>{
  $$('.nav').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  $$('.view').forEach(x=>x.classList.remove('active-view'));
  $('#'+b.dataset.view).classList.add('active-view');
});

['from','to','quarter','type','match'].forEach(id=>$('#'+id).addEventListener('change',render));
$('#reset').onclick=()=>{
  ['from','to'].forEach(id=>$('#'+id).value='');
  ['quarter','type','match'].forEach(id=>$('#'+id).value='all');
  render();
};
$('#search').addEventListener('input',()=>renderRegister(filtered()));
$('#exportBtn').onclick=exportCSV;
$('#themeToggle').onclick=()=>applyTheme(document.body.getAttribute('data-theme')==='dark' ? 'light' : 'dark');
