// General configuration
module.exports = {
    application: {
        port: 3000,
        host: "127.0.0.1",
        environment: "development",
        apiVersion: "v1",
        logLevel: "info",
        logFolder: "logs",
        refresh: {
            universe: 3600000, // One hour
            examples: 3600000  // One hour
        }
    }
};
