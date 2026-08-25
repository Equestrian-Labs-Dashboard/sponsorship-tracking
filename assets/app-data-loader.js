window.DATA = {
  quickbooks: {},
  shopify: {},
  loaded: false
};


async function loadDashboardData(){

    try {

        const response = await fetch(
            './data/dashboard.json'
        );


        if(!response.ok){
            throw new Error(
                "No existe dashboard.json"
            );
        }


        const json = await response.json();


        window.DATA = {

            quickbooks:
                json.quickbooks || {},


            shopify:
                json.shopify || {},


            loaded:true
        };


        console.log(
            "Dashboard cargado correctamente",
            window.DATA
        );


        document.dispatchEvent(
            new Event(
                "dashboard-loaded"
            )
        );


    } catch(error){

        console.error(
            "Error cargando dashboard",
            error
        );


        window.DATA.loaded=false;
    }

}


loadDashboardData();
