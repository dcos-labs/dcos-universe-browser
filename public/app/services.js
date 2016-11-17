var services = angular.module("universe-browser.services", []);

var baseURL = window.location.protocol + "//" + window.location.host + window.location.pathname;

services.factory("Packages", function($resource, config) {
    var URL = baseURL + config.application.apiPrefix + "/packages";
    return $resource(
        URL,
        {},
        {
            "getArray": {
                method: "GET",
                transformResponse: function (data) {
                    return { list: angular.fromJson(data) };
                }
            }
        }
    );
});

services.factory("Search", function($resource, config) {
    var URL = baseURL + config.application.apiPrefix + "/search?q=:query";
    return $resource(URL,{
        query: "@query"
    }, {
        search: {
            method: "GET",
            params: {
                query: "@query"
            }
        }
    });
});

services.factory("PackageVersion", function($resource, config) {
    var URL = baseURL + config.application.apiPrefix + "/package/:packageName/version/:version";
    return $resource(URL,{
        packageName: "@packageName",
        version: "@version"
    }, {
        get: {
            method: "GET",
            params: {
                packageName: "@packageName",
                version: "@version"
            }
        }
    });
});

services.factory("PackageReleaseVersion", function($resource, config) {
    var URL = baseURL + config.application.apiPrefix + "/package/:packageName/releaseVersion/:releaseVersion";
    return $resource(URL,{
        packageName: "@packageName",
        releaseVersion: "@releaseVersion"
    }, {
        get: {
            method: "GET",
            params: {
                packageName: "@packageName",
                releaseVersion: "@releaseVersion"
            }
        }
    });
});

services.factory("PackageVersions", function($resource, config) {
    var URL = baseURL + config.application.apiPrefix + "/package/:packageName/versions";
    return $resource(URL,{
        packageName:'@packageName'
    }, {
        get: {
            method: 'GET',
            params: {
                packageName: '@packageName'
            }
        }
    });
});

services.factory("PackageDocs", function($resource, config) {
    var URL = baseURL + config.application.apiPrefix + "/package/:packageName/docs";
    return $resource(URL,{
        packageName:'@packageName'
    }, {
        get: {
            method: 'GET',
            params: {
                packageName: '@packageName'
            }
        }
    });
});

services.factory("PackageReleaseVersions", function($resource, config) {
    var URL = baseURL + config.application.apiPrefix + "/package/:packageName/versions";
    return $resource(URL,{
        packageName:'@packageName'
    }, {
        get: {
            method: 'GET',
            params: {
                packageName: '@packageName'
            }
        }
    });
});
