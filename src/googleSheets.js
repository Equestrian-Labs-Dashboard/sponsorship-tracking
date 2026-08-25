import { google } from "googleapis";


export async function getSheetsList(){

    const credentials =
    JSON.parse(
        process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    );


    const auth =
    new google.auth.GoogleAuth({

        credentials,

        scopes:[
            "https://www.googleapis.com/auth/spreadsheets.readonly"
        ]

    });


    const sheets =
    google.sheets({
        version:"v4",
        auth
    });


    const result =
    await sheets.spreadsheets.get({

        spreadsheetId:
        process.env.GOOGLE_SHEET_ID

    });


    return result.data.sheets.map(
        s=>s.properties.title
    );

}



export async function readSheet(sheetName){


    const credentials =
    JSON.parse(
        process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    );


    const auth =
    new google.auth.GoogleAuth({

        credentials,

        scopes:[
            "https://www.googleapis.com/auth/spreadsheets.readonly"
        ]

    });


    const sheets =
    google.sheets({
        version:"v4",
        auth
    });



    const result =
    await sheets.spreadsheets.values.get({

        spreadsheetId:
        process.env.GOOGLE_SHEET_ID,


        range:
        `${sheetName}!A:Z`

    });



    const rows =
    result.data.values || [];


    if(rows.length < 2)
        return [];



    const headers =
    rows[0];


    return rows.slice(1).map(row=>{

        let obj={};


        headers.forEach((h,i)=>{

            obj[h]=row[i] || "";

        });


        return obj;

    });

}
