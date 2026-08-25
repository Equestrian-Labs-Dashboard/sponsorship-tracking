let DATA = {
    sponsorships: [],
    accounting: [],
    shopify: {}
};


async function loadDashboard(){

    try{

        const response = await fetch(
            "data/dashboard.json"
        );


        if(!response.ok){
            throw new Error(
                "No se encontró dashboard.json"
            );
        }


        const json = await response.json();


        console.log(
            "Dashboard cargado:",
            json
        );


        const qb = json.quickbooks || {};


        DATA.shopify = json.shopify || {};


        DATA.accounting = [
            ...(qb.bills || []),
            ...(qb.payables || []),
            ...(qb.transactions || []),
            ...(qb.ledger || []),
            ...(qb.vendorBalance || [])
        ];



        DATA.sponsorships =
            buildSponsorshipRows(
                DATA.shopify,
                DATA.accounting
            );



        window.DASHBOARD_DATA = DATA;


        document.dispatchEvent(
            new CustomEvent(
                "dashboard-loaded",
                {
                    detail: DATA
                }
            )
        );


        console.log(
            "Dashboard listo",
            DATA
        );


    }
    catch(error){

        console.error(
            "Error cargando dashboard",
            error
        );

    }

}



function buildSponsorshipRows(
    shopify,
    accounting
){

    let rows=[];


    const sources=[
        ...(shopify.corro || []),
        ...(shopify.cavali || [])
    ];



    sources.forEach(order=>{


        rows.push({

            date:
                order.created_at ||
                "",


            order:
                order.name ||
                order.id ||
                "",


            recipient:
                order.customer?.first_name ||
                "Unknown",


            product:
                order.line_items?.[0]?.title ||
                "",


            sku:
                order.line_items?.[0]?.sku ||
                "",


            qty:
                order.line_items?.reduce(
                    (a,i)=>a+(i.quantity||0),
                    0
                )
                ||0,


            retail:
                Number(order.total_price || 0),


            cost:0,


            type:
                "Shopify",


            detectedBy:
                "Shopify API",


            confidence:
                "High",


            match:
                "Needs Review"


        });


    });



    return rows;

}



loadDashboard();
