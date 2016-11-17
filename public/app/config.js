angular.module('universe-browser.config', []).
    value('config', {
        application: {
            apiPrefix: "api/v1",
            reloadInterval: 3000
        }
    });