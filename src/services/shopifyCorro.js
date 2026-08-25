export async function getCorroOrders(){


const url =
`https://${process.env.CORRO_SHOPIFY_STORE}/admin/api/2026-01/orders.json`;



const response =
await fetch(url,{

headers:{

"X-Shopify-Access-Token":
process.env.CORRO_SHOPIFY_ACCESS_TOKEN

}

});


const data =
await response.json();


return data.orders || [];

}
