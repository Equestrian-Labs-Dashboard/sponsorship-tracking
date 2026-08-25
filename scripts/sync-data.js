import fs from 'fs';
import { google } from 'googleapis';

const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes:['https://www.googleapis.com/auth/spreadsheets.readonly']
});

const api = google.sheets({version:'v4', auth});

async function readSheet(name){
 const r = await api.spreadsheets.values.get({
  spreadsheetId: process.env.GOOGLE_SHEET_ID,
  range: `${name}!A:Z`
 });
 const rows=r.data.values||[];
 if(!rows.length) return [];
 const headers=rows.shift();
 return rows.map(row=>Object.fromEntries(headers.map((h,i)=>[h,row[i]||''])));
}

async function shopify(store, token){
 const r=await fetch(`https://${store}/admin/api/2026-01/orders.json`,{
 headers:{'X-Shopify-Access-Token':token}
 });
 const j=await r.json();
 return j.orders||[];
}

const data={
 quickbooks:{
  bills: await readSheet('QuickBooks Bill'),
  vendorBalance: await readSheet('QuickBooks Vendor Balance Detail Import'),
  ledger: await readSheet('QuickBooks General Ledger Import'),
  transactions: await readSheet('QuickBooks Transaction List By Vendor'),
  payables: await readSheet('Payables')
 },
 shopify:{
  corro: await shopify(process.env.CORRO_SHOPIFY_STORE,process.env.CORRO_SHOPIFY_ACCESS_TOKEN),
  cavali: await shopify(process.env.CAVALI_SHOPIFY_STORE,process.env.CAVALI_SHOPIFY_ACCESS_TOKEN)
 }
};

fs.writeFileSync('data/dashboard.json',JSON.stringify(data,null,2));
console.log('dashboard.json generado');
