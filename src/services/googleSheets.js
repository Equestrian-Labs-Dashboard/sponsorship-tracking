import { google } from "googleapis";

export async function getSheetData(sheetName){
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes:["https://www.googleapis.com/auth/spreadsheets.readonly"]
  });

  const api = google.sheets({version:"v4", auth});

  const response = await api.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range:`'${sheetName}'!A:Z`
  });

  const rows=response.data.values || [];
  if(rows.length < 2) return [];

  const headers=rows[0];

  return rows.slice(1).map(row=>{
    const item={};
    headers.forEach((h,i)=>item[h]=row[i] || "");
    return item;
  });
}
