var CACHE_NAME  = "acg-game-v0.0.1";
var urlsToCache = [
    "index.html",
    "favicon.ico",
    "manifest.json",
    "sw.js",
    "icon-152x152.png",
    "icon-192x192.png",
    "icon-512x512.png",
    "src/controller.js",
    "src/game.js",
    "src/glutil.js",
    "src/main.js",
    "src/offscreen.js",
    "src/realscreen.js",
    "src/scene_game.js",
    "src/scene_start.js",
    "src/scenebase.js",
    "src/strutil.js",
];


////////// 以下おまじない //////////

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(
            function(cache){
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', function(evt) {
    // ここは空でもOK
    //evt.respondWith(
    //    caches.match(event.request)
    //      .then(
    //      function (response) {
    //          if (response) {
    //              return response;
    //          }
    //          return fetch(event.request);
    //      })
    //  );
})
