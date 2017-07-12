let express = require("express");
let app = express();
let controller = require('./controller');

app.set("view engine", "pug");

app.use(express.static('./public'));

controller(app);

const port = process.env.PORT || 3000;

app.listen(port, function(){
    console.log("Server running");
});
