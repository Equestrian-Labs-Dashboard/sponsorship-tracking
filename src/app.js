import {loadDashboard}
from "./data/dashboardLoader.js";



loadDashboard()

.then(data=>{


console.log(
"DATOS REALES",
data
);



window.dashboardData=data;


});
