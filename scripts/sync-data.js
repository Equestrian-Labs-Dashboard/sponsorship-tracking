import fs from "fs";
import {readSheet} from "../src/googleSheets.js";



async function shopify(store,token){


const response =
await fetch(

`https://${store}/admin/api/2026-01/orders.json`,

{

headers:{

"X-Shopify-Access-Token":token

}

}

);



if(!response.ok){

throw new Error(
"Error Shopify"
);

}


const data =
await response.json();


return data.orders || [];

}




async function main(){



const data={


quickbooks:{


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



shopify:{


corro:
await shopify(

process.env.CORRO_SHOPIFY_STORE,

process.env.CORRO_SHOPIFY_ACCESS_TOKEN

),



cavali:
await shopify(

process.env.CAVALI_SHOPIFY_STORE,

process.env.CAVALI_SHOPIFY_ACCESS_TOKEN

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
)

);



console.log(
"Datos generados correctamente"
);


}



main()
.catch(error=>{

console.error(error);

process.exit(1);

});
