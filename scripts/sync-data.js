import fs from "fs";
import { readSheet } from "../src/googleSheets.js";


async function shopify(store, token, name) {

    console.log(`Consultando Shopify ${name}...`);


    const response = await fetch(
        `https://${store}/admin/api/2026-01/orders.json`,
        {
            headers: {
                "X-Shopify-Access-Token": token,
                "Content-Type": "application/json"
            }
        }
    );


    if (!response.ok) {

        const errorText = await response.text();

        throw new Error(
            `Shopify ${name} error ${response.status}: ${errorText}`
        );

    }


    const data = await response.json();


    return data.orders || [];

}



async function main() {


    console.log("=== INICIO SINCRONIZACION ===");


    const data = {


        quickbooks: {


            bills:
            await readSheet(
                "QuickBooks Bill"
            ),


            vendorBalance:
            await readSheet(
                "QuickBooks Vendor Balance Detail Import"
            ),


            ledger:
            await readSheet(
                "QuickBooks General Ledger Import"
            ),


            transactions:
            await readSheet(
                "QuickBooks Transaction List By Vendor"
            ),


            payables:
            await readSheet(
                "Payables"
            )

        },


        shopify: {


            corro:
            await shopify(
                process.env.CORRO_SHOPIFY_STORE,
                process.env.CORRO_SHOPIFY_ACCESS_TOKEN,
                "CORRO"
            ),



            cavali:
            await shopify(
                process.env.CAVALI_SHOPIFY_STORE,
                process.env.CAVALI_SHOPIFY_ACCESS_TOKEN,
                "CAVALI"
            )


        }


    };



    fs.mkdirSync(
        "data",
        {
            recursive:true
        }
    );



    fs.writeFileSync(

        "data/dashboard.json",

        JSON.stringify(
            data,
            null,
            2
        ),

        "utf8"

    );



    if(fs.existsSync("data/dashboard.json")){


        console.log(
            "OK dashboard.json creado correctamente"
        );


    }else{


        throw new Error(
            "No se pudo crear dashboard.json"
        );


    }


    console.log(
        "=== FIN SINCRONIZACION ==="
    );


}




main()
.catch(error=>{


    console.error(
        "ERROR GENERAL:",
        error
    );


    process.exit(1);


});
