var controllers = angular.module('universe-browser.controllers', []);

controllers.controller('MainController', function($scope, $window, $route) {

    $scope.$route = $route;

    $scope.toggleSidebar = function() {
        $scope.toggle = !$scope.toggle;
    };

    window.onresize = function() {
        $scope.$apply();
    };

    $scope.scroll = 0;

    $scope.transparencyOn = true;

});

controllers.controller('PackagesController', function($scope, Packages) {

    $scope.$parent.transparencyOn = false;

    $scope.packages = [];
    $scope.rows = [];
    var rowCols = 6;

    Packages.getArray(function (packages) {
        $scope.packages = packages.list;

        var row = [];
        packages.list.forEach(function (pkg) {
            if (row.length < rowCols) {
                row.push(pkg);
            } else {
                $scope.rows.push(row);
                row = [];
                row.push(pkg);
            }
        });

        // Push remaining row as well
        if (row.length > 0) {
            $scope.rows.push(row)
        }
    });

});

controllers.controller('PackageController', function($scope, PackageVersion, PackageVersions, $routeParams) {

    // Top menu
    $scope.$parent.transparencyOn = false;

    // Store package info
    $scope.packageInfo = {};

    $scope.notFound = false;

    if (!$routeParams.version) {
        $routeParams.version = "latest";
    }

    PackageVersion.get({
        packageName: $routeParams.name,
        version: $routeParams.version
    }).$promise.then(function(data) {
        if (!data) {
            $scope.notFound = true;
        } else {
            var temp = data.toJSON();

            // RegEx to match URLs in the description
            var urlMatcher = /(http|https|ftp|ftps)\:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,3}(\/\S*)?/g;

            // Match urls
            var matches = temp.description.match(urlMatcher);

            // Replace plain text links with html links if found any
            if (matches && matches.length > 0) {
                matches.forEach(function (match) {
                    temp.description = temp.description.replace(match, "<a href='" + match + "' target='_blank'>" + match + "</a>");
                });
            }

            // Assign package info
            $scope.packageInfo = temp;

            PackageVersions.get({
                packageName: $routeParams.name
            }).$promise.then(function(data) {
                if (!data) {
                    console.log("Got no data!")
                } else {
                    $scope.packageInfo.versions = data.toJSON().versions;
                }
            });

        }
    });

});

controllers.controller('PackageDocsController', function($scope, config, $http, PackageVersion, PackageDocs, $routeParams) {

    // Top menu
    $scope.$parent.transparencyOn = false;

    // Store package info
    $scope.packageInfo = {};

    // Store example html
    $scope.exampleHtml = "";

    $scope.notFound = false;

    if (!$routeParams.version) {
        $routeParams.version = "latest";
    }

    PackageVersion.get({
        packageName: $routeParams.name,
        version: $routeParams.version
    }).$promise.then(function(data) {
        if (!data) {
            $scope.notFound = true;
        } else {
            $scope.packageInfo = data.toJSON();

            var baseURL = window.location.protocol + "//" + window.location.host + window.location.pathname;
            var URL = baseURL + config.application.apiPrefix + "/package/" + $routeParams.name + "/docs";

            $http({method: "GET", url: URL})
                .success(function (data) {
                    $scope.exampleHtml = data;
                });

        }
    });

});

controllers.controller('SearchController', function($scope, $http, $location, Search) {

    $scope.$parent.transparencyOn = true;
    $scope.packages = [];
    $scope.selectedPackage = undefined;

    $scope.showPackageDetails = function ($item, $model, $label, $event) {
        $location.path("/package/" + $model.name + "/version/latest");
    };

    $scope.searchPackages = function (query) {
        return Search.search({
            query: query
        }).$promise.then(function(data) {
            var searchResult = data.toJSON().results;
            return searchResult;
        });
    };

});