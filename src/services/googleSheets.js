import { google } from "googleapis";
import { SHEETS } from "../config/sheets.js";

function getCredentials(){
  if(!process.env.GOOGLE_SERVICE_ACCOUNT_JSON){
    throw new Error("Falta GOOGLE_SERVICE_ACCOUNT_JSON");
  }
  return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
}

const auth = new google.auth.GoogleAuth({
  credentials: getCredentials(),
  scopes:["https://www.googleapis.com/auth/spreadsheets.readonly"]
});

const sheets = google.sheets({version:"v4", auth});

export async function readSheet(tab){
 const result = await sheets.spreadsheets.values.get({
  spreadsheetId: process.env.GOOGLE_SHEET_ID,
  range: `${tab}!A:Z`
 });
 const rows=result.data.values || [];
 if(rows.length===0) return [];
 const headers=rows.shift();
 return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]||""])));
}

export const getBills=()=>readSheet(SHEETS.bills);
export const getVendorBalance=()=>readSheet(SHEETS.vendorBalance);
export const getLedger=()=>readSheet(SHEETS.ledger);
export const getTransactions=()=>readSheet(SHEETS.transactions);
