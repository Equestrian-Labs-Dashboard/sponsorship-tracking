import {getBills,getLedger,getVendorBalance} from './src/services/googleSheets.js';
console.log(await getBills().then(x=>`Bills: ${x.length}`));
console.log(await getVendorBalance().then(x=>`Vendor: ${x.length}`));
console.log(await getLedger().then(x=>`Ledger: ${x.length}`));
