/**
 * See src/filesystem/impls/filer/UrlCache.js. If the browser supports
 * CacheStorage and Service Worker, we cache request/response pairs
 * for all files in the filesystem.  Each project root gets its own cache,
 * which is named vfs/project/root.
 */

// String comes from src/filesystem/impls/filer/UrlCache.js
var liveDevUrlRegex = /thimble-sw-vfs-cached-url\//;

function custom500() {
    "use strict";

    var body = "<!doctype html><title></title><p>There was an error serving your content. Try restarting your web browser to clear your cache.";
    var init = {
        status: 500,
        statusText: "Thimble live dev server failed to find cached URL",
        headers: {
            "Content-Type": "text/html"
        }
    };

    return new Response(body, init);
}

self.addEventListener("fetch", function(event) {
    "use strict";

    // Strip params off URL so it will properly match what's in cache
    var url = event.request.url.split(/[?#]/)[0];

    event.respondWith(
        caches.match(url)
        .then(function(response) {
            // Either we have this file's response cached, or we should go to the network
            if(response) {
                return response;
            }

            // We expect to have a cached response for live dev URL requests, so it's
            // odd that we don't.  Return a custom 500 indicating that something's wrong.
            if(liveDevUrlRegex.test(url)) {
                return custom500();
            }

            // Let this go through to the network
            return fetch(event.request);
        })
        .catch(function(err) {
            console.warn("[Bramble Service Worker Error]: couldn't serve URL", url, err);
            return fetch(event.request);
        })
    );
});
