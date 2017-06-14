var app = angular.module("universe-browser", [
    "ngRoute",
    "ngResource",
    "ngSanitize",
    "ui.bootstrap",
    "truncate",
	"universe-browser.config",
	"universe-browser.controllers",
	"universe-browser.services"
]);

app.config(["$routeProvider", function ($routeProvider) {
    $routeProvider.when("/", {
        templateUrl: "partials/search.html",
        controller: "SearchController",
        activeTab: "search"
    }).when("/packages", {
        templateUrl: "partials/packages.html",
        controller: "PackagesController",
        activeTab: "packages"
    }).when("/package/:name/version/:version", {
        templateUrl: "partials/package.html",
        controller: "PackageController",
        activeTab: "package"
    }).when("/package/:name/docs", {
        templateUrl: "partials/package-docs.html",
        controller: "PackageDocsController",
        activeTab: "packageDocs"
    }).otherwise({
        redirectTo: "/"
    });
}]);


app.directive("scrollPosition", function($window) {
    return {
        scope: {
            scroll: "=scrollPosition"
        },
        link: function(scope, element, attrs) {
            var windowEl = angular.element($window);
            var handler = function() {
                scope.scroll = windowEl.scrollTop();
            };
            windowEl.on("scroll", scope.$apply.bind(scope, handler));
            handler();
        }
    };
});

app.run(function($rootScope, $location, $anchorScroll) {
    //when the route is changed scroll to the proper element.
    $rootScope.$on('$routeChangeSuccess', function(newRoute, oldRoute) {
        if ($location.hash()) {
            $anchorScroll();
        }
    });
});
