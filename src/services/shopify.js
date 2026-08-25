async function shopifyRequest(store, token){
 const r=await fetch(`https://${store}/admin/api/2026-01/orders.json`,{
  headers:{"X-Shopify-Access-Token":token}
 });
 if(!r.ok) throw new Error(`Shopify error ${r.status}`);
 return (await r.json()).orders || [];
}
export const getCorroOrders=()=>shopifyRequest(process.env.CORRO_SHOPIFY_STORE,process.env.CORRO_SHOPIFY_ACCESS_TOKEN);
export const getCavaliOrders=()=>shopifyRequest(process.env.CAVALI_SHOPIFY_STORE,process.env.CAVALI_SHOPIFY_ACCESS_TOKEN);
