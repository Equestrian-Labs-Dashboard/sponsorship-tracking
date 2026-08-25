import {getSheetData}
from "../services/googleSheets.js";


import {getCorroOrders}
from "../services/shopifyCorro.js";


import {getCavaliOrders}
from "../services/shopifyCavali.js";


import {SHEETS}
from "../config/sheets.js";




export async function loadDashboard(){



const bills =
await getSheetData(
SHEETS.BILL
);



const vendors =
await getSheetData(
SHEETS.VENDOR_BALANCE
);



const ledger =
await getSheetData(
SHEETS.GENERAL_LEDGER
);



const transactions =
await getSheetData(
SHEETS.TRANSACTION_VENDOR
);



const corro =
await getCorroOrders();



const cavali =
await getCavaliOrders();



return {


quickbooks:{


bills,

vendors,

ledger,

transactions

},


shopify:{


corro,

cavali

}


};


}
