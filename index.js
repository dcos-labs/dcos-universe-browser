// Internal modules
var fs = require("fs");
var path = require("path");

// NPM modules
var express = require("express");
var morgan = require("morgan");

// Project modules
var config = require("./lib/config");
var api = require("./routes/api");

// Create the Express object
var app = express();

// Get real ip if passed by nginx
morgan.token("remote-addr", function (req) {
    return req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || req.connection.remoteAddress;
});

// Set application properties
app.set("port", process.env.PORT0 || config.application.port);
app.set("host", process.env.HOST || config.application.host);
app.set("env", process.env.NODE_ENV || config.application.environment);
app.set("logLevel", process.env.LOG_LEVEL || config.application.logLevel);

// Setup the logger for the routes
 app.use(morgan("combined", { skip: false}));

// Define static files path
app.use(express.static("public"));

// Create routes
app.use("/api/" + config.application.apiVersion, api);

// /health endpoint for Marathon health checks
app.get("/health", function(req, res) {
    res.send("OK");
});

var server = app.listen(app.get("port"), app.get("host"), function() {
    console.log("Express server listening on port " + server.address().port + " on " + server.address().address);
});
