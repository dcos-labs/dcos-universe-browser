# dcos-universe-browser

The repository provides a web application for browsing the DC/OS Universe packages.

## Using

You can find the deployed application at [https://universe.dcos.io](https://universe.dcos.io), install it locally, or use the [dcoslabs/dcos-universe-browser](https://hub.docker.com/r/dcoslabs/dcos-universe-browser/) Docker image.

## Installation

### Prerequisites

* Node.js >= 4
* Git

### Local installation

You can host a local instance via

    git clone https://github.com/dcos-labs/dcos-universe-browser.git
    
and installing the dependencies with

    npm run install-deps
    
and starting the application with

    npm start
    
### Docker image

You can run the application via a Docker image like this:

    docker run -d --name dcos-universe-browser -p 3000:3000 dcoslabs/dcos-universe-browser
    
This will expose the application on port `3000` on the Docker host.

## Configuration

You can use the following environment variables to influence the application's behavior:

* `HOST`: The IP address to which the application should bind to. Default is `127.0.0.1`.
* `PORT0`: The port on which the application is binding to. Default is `3000`.
* `NODE_ENV`: The environment settings for Node.js. Default is `development`, the Docker image uses `production` as default.
* `REFRESH_UNIVERSE`: The number of milliseconds to wait before a refresh of the Universe package info. The application caches the package info locally, and refreshes it in intervals as defined. Default is `3600000` (one hour).
* `REFRESH_EXAMPLES`: The number of milliseconds to wait before a refresh of [dcos/examples](https://github.com/dcos/examples) data. The application does a `git clone` on start, and refreshes it (via `git pull`) in intervals as defined. Default is `3600000` (one hour).

## Application details

How is it built?

* The backend is a Node.js application, using Express.js to serve static files, and a REST API which is a wrapper around the Universe data.
* The frontend is an Angular 1 app, using Bootstrap 3 and various third-party modules.

What does this application do?

* It fetches the DC/OS Universe information from `https://universe.mesosphere.com/repo`, optimizes the data structures for UI usage, and caches it until the next request interval.
* It clones the [dcos/examples](https://github.com/dcos/examples) project, containing the DC/OS package examples, and merges them with the Universe information. The markdown is rendered as HTML dynamically.
* It renders the combined data as a web application (see above).

## Roadmap

* Improvements for mobile.
* Create package `options.json` files via UI for usage with the DC/OS CLI.
* Add dynamic meta tags & sharing support, via [jvandemo/angular-update-meta](https://github.com/jvandemo/angular-update-meta).
* Integrate [prerender.io](http://www.prerender.io) to optimize for search engines.
