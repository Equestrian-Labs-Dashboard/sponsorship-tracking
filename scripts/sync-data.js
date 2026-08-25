import fs from "fs";
import { google } from "googleapis";

const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

const auth = new google.auth.GoogleAuth({
 credentials,
 scopes:["https://www.googleapis.com/auth/spreadsheets.readonly"]
});

const api = google.sheets({version:"v4", auth});

async function sheet(name){
 const r=await api.spreadsheets.values.get({
  spreadsheetId:process.env.GOOGLE_SHEET_ID,
  range:`'${name}'!A:Z`
 });
 const rows=r.data.values||[];
 if(rows.length<2)return [];
 const headers=rows.shift();
 return rows.map(x=>Object.fromEntries(headers.map((h,i)=>[h,x[i]||""])));
}

async function shop(store,token){
 if(!store||!token)return [];
 const r=await fetch(`https://${store}/admin/api/2026-01/orders.json`,{
 headers:{"X-Shopify-Access-Token":token}
 });
 if(!r.ok) throw new Error("Shopify error "+r.status);
 return (await r.json()).orders||[];
}

async function main(){
 const data={
  accounting:{
   bills:await sheet("QuickBooks Bill"),
   vendorBalance:await sheet("QuickBooks Vendor Balance Detail Import"),
   ledger:await sheet("QuickBooks General Ledger Import"),
   transactions:await sheet("QuickBooks Transaction List By Vendor"),
   payables:await sheet("Payables")
  },
  ecommerce:{
   corro:await shop(process.env.CORRO_SHOPIFY_STORE,process.env.CORRO_SHOPIFY_ACCESS_TOKEN),
   cavali:await shop(process.env.CAVALI_SHOPIFY_STORE,process.env.CAVALI_SHOPIFY_ACCESS_TOKEN)
  }
 };
 fs.mkdirSync("data",{recursive:true});
 fs.writeFileSync("data/dashboard.json",JSON.stringify(data,null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});
