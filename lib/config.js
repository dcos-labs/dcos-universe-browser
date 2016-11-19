// General configuration
module.exports = {
    application: {
        host: process.env.HOST || "127.0.0.1",
        port: process.env.PORT0 || 3000,
        environment: process.env.NODE_ENV || "development",
        apiVersion: "v1",
        logLevel: "info",
        logFolder: "logs",
        refresh: {
            universe: process.env.REFRESH_UNIVERSE || 3600000, // One hour
            examples: process.env.REFRESH_EXAMPLES || 3600000  // One hour
        }
    }
};
