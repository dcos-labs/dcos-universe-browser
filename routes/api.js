// Internal modules
var path = require("path");
var fs = require("fs");

// NPM modules
var request = require("request");
var lunr = require("lunr");
var rimraf = require("rimraf");
var mkdirp = require("mkdirp");
var router = require("express").Router();
var showdown  = require("showdown");
var converter = new showdown.Converter();
var fs2obj = require('fs2obj');

// Project modules
var config = require("../lib/config");
var packageDetails = require("../package.json");

// Define base folder for dcos/examples repo
var dcosExamplesFolder = path.join(__dirname, "../", "dcos-examples");

// Clean dcos/examples repo folder
rimraf.sync(dcosExamplesFolder);

// Global git object
var git = {};

// Create cache object for the dcos/example packages
var exampleCache = {};

// Placeholder for the pull interval
var pullInterval = {};

// Placeholder for the repository interval
var repositoryInterval = {};

// Create clean folder for dcos/examples repo
mkdirp(dcosExamplesFolder, function (err) {
    if (err) {
        console.error(err);
        process.exit(1);
    } else {
        console.log("Created folder for repo dcos/examples");
        // Instantiate git
        git = require('simple-git')(dcosExamplesFolder);
        console.log("Instantiated git");
        // Clone the repo
        git.clone("https://github.com/dcos/examples.git", dcosExamplesFolder, {}, function (err, result) {
            if (err) {
                console.log(err);
                process.exit(1);
            } else {
                console.log("Successfully cloned dcos/example repository");
                // Fill the examplesCache with the rendered results of the markdown files
                fillExamples();
                console.log("Generated and cached HTML from the dcos/example repository");
                // Load the repository initially
                loadRepository();
                console.log("Initially loaded the DC/OS repository information");
                // Set the periodical "git pull" as interval, every 5 minutes
                pullInterval = setInterval(function () {
                    var startTime = new Date().getTime();
                    git.pull("origin", "master", function(err, result) {
                        var endTime = new Date().getTime();
                        if (err) {
                            console.log("Pull from origin/master failed in " + (endTime-startTime) + "ms");
                            console.log(err);
                            //process.exit(1);
                        } else {
                            console.log("Successfully pulled from origin/master in " + (endTime-startTime) + "ms");
                            // Fill the examplesCache with the rendered results of the markdown files
                            fillExamples();
                            console.log("Updated and cached HTML from the dcos/example repository");
                        }
                    });
                }, config.application.refresh.examples);
                console.log("Started dcos/example pull interval (" + (config.application.refresh.examples/1000) + " secs)!");
                // Set periodical for repository refresh as interval
                repositoryInterval = setInterval(loadRepository, config.application.refresh.universe);
                console.log("Started load repository interval (" + (config.application.refresh.universe/1000) + " secs)!");
            }
        });
    }
});

function fillExamples() {

    // Read the folder/file structure
    var folderStructure = fs2obj(dcosExamplesFolder);

    // RegExp for finding anchor links in the markdown files
    var relativeLinkRegExp = /\(#(.*?)\)/g; // Matches "(#my-test-link)" as "my-test-link"

    // Reset exampleCache
    exampleCache = {};

    // Iterate over items
    folderStructure.items.forEach(function (item) {
        // Use folders / exclude the old 1.8 folder
        if (item.type === "folder" && item.name !== "1.8") {
            // Set package name
            var packageName = item.name.toLowerCase();
            // Set baseUrl
            var baseUrl = "https://raw.githubusercontent.com/dcos/examples/master/" + packageName + "/";
            // Example versions
            var exampleVersions = [];
            // Check for examples
            if (item.items && Array.isArray(item.items)) {
                // Iterate and check for DC/OS versions
                item.items.forEach(function (subItem) {
                    if (subItem.type === "folder" && subItem.name.indexOf("1.") > -1) {
                        // Add to versions
                        exampleVersions.push(subItem.name);
                    }
                });
                // Sort semantic versions
                exampleVersions.sort(function (a, b) { // From https://stackoverflow.com/a/16187766/1603357
                    var i, diff;
                    var regExStrip0 = /(\.0+)+$/;
                    var segmentsA = a.replace(regExStrip0, '').split('.');
                    var segmentsB = b.replace(regExStrip0, '').split('.');
                    var l = Math.min(segmentsA.length, segmentsB.length);

                    for (i = 0; i < l; i++) {
                        diff = parseInt(segmentsA[i], 10) - parseInt(segmentsB[i], 10);
                        if (diff) {
                            return diff;
                        }
                    }
                    return segmentsA.length - segmentsB.length;
                });
            }
            // Check if we have a valid example
            if (exampleVersions.length > 0) {
                // Read README.md contents (for the latest existing version)
                var exampleContents = fs.readFileSync(dcosExamplesFolder + "/" + packageName + "/" + exampleVersions[exampleVersions.length-1] + "/README.md", "utf8").toString();
                // Get relative links
                var relativeLinks = exampleContents.match(relativeLinkRegExp);
                // Check if anchor links found
                if (relativeLinks && relativeLinks.length > 0) {
                    // Handle relative links -> Replace with full link including the anchor
                    relativeLinks.forEach(function (relativeLink) {
                        var bareLink = relativeLink.replace("(", "").replace(")", "").replace(/-/g, "");
                        var replaceRelativeLink = "(/#/package/" + packageName + "/docs" + bareLink + ")";
                        exampleContents = exampleContents.replace(relativeLink, replaceRelativeLink)
                    });
                }
                // Convert to HTML and replace image sources
                var htmlCode = converter.makeHtml(exampleContents).replace(/img\//g, baseUrl + "/" + exampleVersions[exampleVersions.length-1] + "/img/"); // Replace relative URL with absolute URL

                // There is an example for this package
                exampleCache[packageName] = {
                    renderedHtml: htmlCode,
                    enabled: true,
                    exampleVersion: exampleVersions[exampleVersions.length-1]
                };
            }
        }
    });

}

// Sample call to DC/OS universe
// curl -X GET -L -H "user-agent: dcos/1.8" -H "accept: application/vnd.dcos.universe.repo+json;charset=utf-8;version=v3" "https://universe.mesosphere.com/repo"

// Set request options
var options = {
    "headers": {
        "user-agent": "dcos/1.10",
        "accept": "application/vnd.dcos.universe.repo+json;charset=utf-8;version=v3"
    },
    "uri": "https://universe.mesosphere.com/repo",
    "method": "GET"
};

// Create packages singleton
var packages = {
    index: lunr(function () {
        this.field("name");
        this.field("tags", {boost: 10});
        this.field("description");
        this.field("releaseVersion");
        this.ref("name")
    }),
    map: {},
    list: []
};

// Tags
var tags = {};

// Reset packages function
var resetPackages = function () {
    packages.index = lunr(function () {
        this.field("name");
        this.field("tags", {boost: 10});
        this.field("description");
        this.field("releaseVersion");
        this.ref("name")
    });
    // Reset other properties
    packages.list.length = 0;
    packages.map = {};
};

// Reset tags function
var resetTags = function () {
    tags = {};
};

function generateSortFn(prop, reverse) {
    return function (a, b) {
        if (a[prop] < b[prop]) return reverse ? 1 : -1;
        if (a[prop] > b[prop]) return reverse ? -1 : 1;
        return 0;
    };
}

var loadRepository = function () {
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {

            var universeResponse = JSON.parse(body);

            // Reset package singleton
            resetPackages();

            // Reset tags singleton
            resetTags();

            // Create temporary array
            var tempPackagesArray = [];

            // Iterate over the packages/package versions
            universeResponse.packages.forEach(function (packageObj) {

                // Initialize the package if it doesn't exist yet
                if (!packages.map.hasOwnProperty(packageObj.name)) {
                    packages.map[packageObj.name] = {
                        versions: {},
                        releaseVersions: {},
                        latest: null,
                        latestVersion: -1
                    }
                }

                var imagesObj = {};
                var screenshots = {};

                // Replace plain http image urls with https urls, to get rid of mixed-content warnings
                // Workaround for excluding erroneous packages"dynatrace", "sysdig-cloud" -> Remove once they're fixed
                if (packageObj.resource && packageObj.resource.images && Object.getOwnPropertyNames(packageObj.resource.images).length > 0 && ["dynatrace", "sysdig-cloud"].indexOf(packageObj.name) === -1) {
                    if (packageObj.resource.images.screenshots) {
                        screenshots = packageObj.resource.images.screenshots;
                        delete packageObj.resource.images.screenshots;
                    }
                    Object.getOwnPropertyNames(packageObj.resource.images).forEach(function (imageType) {
                        imagesObj[imageType] = packageObj.resource.images[imageType].replace(/^http:\/\//i, 'https://');
                    });
                } else {
                    // Assign placeholder images in the correct dimensions
                    imagesObj = {
                        "icon-small": "https://placehold.it/48x48&text=" + packageObj.name,
                        "icon-medium": "https://placehold.it/96x96&text=" + packageObj.name,
                        "icon-large": "https://placehold.it/256x256&text=" + packageObj.name
                    }
                }

                // Create smaller packageObj
                var smallPackageObj = {
                    id: packageObj.name + "-" + packageObj.releaseVersion,
                    name: packageObj.name,
                    description: packageObj.description,
                    tags: packageObj.tags,
                    version: packageObj.version,
                    releaseVersion: packageObj.releaseVersion,
                    packagingVersion: packageObj.packagingVersion,
                    minDcosReleaseVersion: packageObj.minDcosReleaseVersion ||null,
                    maintainer: packageObj.maintainer || null,
                    website: packageObj.website || null,
                    scm: packageObj.scm || null,
                    isFramework: packageObj.framework || false,
                    preInstallNotes: packageObj.preInstallNotes || null,
                    postInstallNotes: packageObj.postInstallNotes || null,
                    postUninstallNotes: packageObj.postUninstallNotes || null,
                    licenses: packageObj.licenses || null,
                    images: imagesObj,
                    screenshots: screenshots || null,
                    hasExample : ((exampleCache[packageObj.name] && exampleCache[packageObj.name].hasOwnProperty("enabled")) ? exampleCache[packageObj.name].enabled : false)
                };

                // Create version map entry
                packages.map[packageObj.name].releaseVersions[packageObj.releaseVersion.toString()] = smallPackageObj;
                packages.map[packageObj.name].versions[packageObj.version.toString()] = smallPackageObj;

                // Check if it's the latest release version, if so sure the version number
                if (packages.map[packageObj.name].latestVersion < packageObj.releaseVersion) {
                    // Set the latestVersion
                    packages.map[packageObj.name].latestVersion = packageObj.releaseVersion;
                    // Set the packageObj as current latest
                    packages.map[packageObj.name].latest = smallPackageObj;
                }

            });

            // Get latest versions per package, and store them (for search)
            Object.getOwnPropertyNames(packages.map).forEach(function (packageName) {
                // Get current package
                var latestPackageVersion = packages.map[packageName].latest;
                // Add to tempPackagesArray
                tempPackagesArray.push(latestPackageVersion);
                // Index the current package
                packages.index.add({
                    name: latestPackageVersion.name,
                    description: latestPackageVersion.description,
                    tags: latestPackageVersion.tags,
                    releaseVersion: latestPackageVersion.releaseVersion
                });
                // Add tags
                if (latestPackageVersion.tags && Array.isArray(latestPackageVersion.tags)) {
                    latestPackageVersion.tags.forEach(function (tag) {
                        // Check if the tag is not a package name
                        if (Object.getOwnPropertyNames(packages.map).indexOf(tag) === -1) {
                            if (!tags.hasOwnProperty(tag.toLowerCase())) {
                                tags[tag.toLowerCase()] = {
                                    count: 0,
                                    packages: []
                                };
                            }
                            tags[tag.toLowerCase()].count++;
                            tags[tag.toLowerCase()].packages.push(latestPackageVersion.name);
                        }
                    });
                }
            });

            // Store the array as pac
            packages.list = tempPackagesArray.sort(generateSortFn("name", false));

        }
    });
};

router.get("/search", function(req, res) {

    var searchString = req.query.q;

    var searchResult = packages.index.search(searchString);

    var resultArray = [];

    searchResult.forEach(function (searchResult) {
        resultArray.push(packages.map[searchResult.ref].latest);
    });

    res.json({ results: resultArray });

});

router.get("/packages", function(req, res) {

    res.json(packages.list);

});

router.get("/package/:packageName/docs", function(req, res) {

    if (packages.map[req.params.packageName]) {

        // Check if there there's already a renderedHtml property
        if (exampleCache.hasOwnProperty(req.params.packageName) && exampleCache[req.params.packageName].renderedHtml) {

            // Send renderedHtml
            res.send(exampleCache[req.params.packageName].renderedHtml);

        } else {
            res.status(404).json({ error: "No rendered example found for " + req.params.packageName });
        }

    } else {
        res.status(404).json({ error: "No matching package found!" });
    }

});

router.get("/package/:packageName/version/:packageVersion", function(req, res) {

    if (packages.map[req.params.packageName]) {

        if (req.params.packageVersion === "latest") {
            res.json(packages.map[req.params.packageName].latest)
        } else {
            if (packages.map[req.params.packageName].versions.hasOwnProperty(req.params.packageVersion)) {
                res.json(packages.map[req.params.packageName].versions[req.params.packageVersion])
            } else {
                res.status(404).json({ error: "No matching package version found!" });
            }
        }

    } else {
        res.status(404).json({ error: "No matching package found!" });
    }

});

router.get("/package/:packageName/releaseVersion/:packageReleaseVersion", function(req, res) {

    if (packages.map[req.params.packageName]) {

        if (req.params.packageReleaseVersion === "latest") {
            res.json(packages.map[req.params.packageName].latest)
        } else {
            if (packages.map[req.params.packageName].releaseVersions.hasOwnProperty(req.params.packageReleaseVersion)) {
                res.json(packages.map[req.params.packageName].releaseVersions[req.params.packageReleaseVersion])
            } else {
                res.status(404).json({ error: "No matching package version found!" });
            }
        }

    } else {
        res.status(404).json({ error: "No matching package found!" });
    }

});

router.get("/package/:packageName/versions", function(req, res) {

    if (packages.map[req.params.packageName]) {

        res.json({
            name: req.params.packageName,
            versions: Object.getOwnPropertyNames(packages.map[req.params.packageName].versions).sort()
        });

    } else {
        res.json({ error: "No matching package found!" });
    }

});

router.get("/package/:packageName/releaseVersions", function(req, res) {

    if (packages.map[req.params.packageName]) {

        res.json({
            name: req.params.packageName,
            releaseVersions: Object.getOwnPropertyNames(packages.map[req.params.packageName].releaseVersions).sort()
        });

    } else {
        res.json({ error: "No matching package found!" });
    }

});

router.get("/health", function(req, res) {

    res.send("OK");

});

router.get("/tags", function(req, res) {

    res.json(tags);

});

router.get("/version", function(req, res) {

    res.json({
        "version": packageDetails.version
    });

});

module.exports = router;
