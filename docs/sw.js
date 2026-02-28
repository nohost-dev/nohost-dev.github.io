/**
 * Must be served from root.
 */

const VERSION = "1";
const staticCacheName = `${VERSION}`;
const userAppPattern = /^your\/apps\/.+/;
const placeholders = {
  head: "__REPLACE_HEAD__",
  body: "__REPLACE_BODY__",
};

const noHostRoutes = {
  settings: {
    head: [{ type: "link", href: "/settings.css" }],
    body: [{ type: "script", src: "/settings.js" }],
  },
};

console.log("[SW] Started");
/**
 * The install event triggers once for every new version of the service worker,
 * which should have an updated app_version?
 *
 * The new service worker will not be controlling the page yet, so we cannot
 * discrupt the existing one and its caches.
 *
 * At this point we cache the minimum files required to run.
 */
self.addEventListener("install", (event) => {
  console.log("[SW] Installing SW version:", VERSION);
  event.waitUntil(
    caches.open(staticCacheName).then((cache) => {
      // getFile('/hello.txt')
      console.log("[SW] Caching app shell");
      // return cache.addAll([
      //   new Request("{{ turbopage_template }}", { cache: "no-cache" }),
      //   "/manifest.json"
      // ]);
    })
  );
});

/**
 * This intercepts network requests, including navigation.
 * You really want to preserve console log in dev tools when debugging.
 */
self.addEventListener("fetch", (event) => {
  const request = event.request;
  console.log("[SW] nav to: ", request.mode, request.url);
  if (request.mode == "navigate") {
    const controlledRoute = getControlledRoute(request.url);
    if (controlledRoute) {
      event.respondWith(getControlledRouteResponses(controlledRoute));
    }
  }

  // Handle static assests
  // if (requestShouldBeCached(request)) {
  //   event.respondWith(cacheThenNetwork(event));
  // }
});

async function getControlledRouteResponses(controlledRoute) {
  const isUserAppRoute = userAppPattern.test(controlledRoute);
  const toRemove = isUserAppRoute ? "your/apps/" : "your/";
  const shortPath = controlledRoute.slice(toRemove.length);
  const routeMap = isUserAppRoute ? await userRoutes() : noHostRoutes;

  console.log(routeMap, shortPath);
  const matchingRoute = routeMap.find((entry) => entry.path === shortPath);
  if (matchingRoute) {
    return buildAppResponse(matchingRoute);
  } else {
    const msg = isUserAppRoute ? "is not an app" : "not found";
    return new Response(
      `Service worker failed to find path:\n\n${controlledRoute} ${msg}.`
    );
  }
}

async function getRouteManifest(manifestPath) {
  const response = await fetch(manifestPath);
  const data = await response.json();
  const base = manifestPath.substring(0, manifestPath.lastIndexOf("/"));
  return { ...data, base };
}

async function buildAppResponse(route) {
  const manifest = await getRouteManifest(route.manifest);
  const { base } = manifest;
  head = assetsToString(manifest.head, base);
  body = assetsToString(manifest.body, base);
  const response = await fetch("/skeleton.html");
  const bodyStream = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(streamingReplace(placeholders.head, head))
    .pipeThrough(streamingReplace(placeholders.body, body))
    .pipeThrough(new TextEncoderStream());
  return new Response(bodyStream, response);
}

const isRelativePath = (path) =>
  !(path.startsWith("/") || path.startsWith("http"));

function assetsToString(assets, base) {
  if (typeof assets === "string") return assets;
  if (Array.isArray(assets)) {
    let str = "";
    assets.forEach((asset) => {
      let path = asset.path;
      if (isRelativePath(path)) path = base + "/" + path;
      if (asset.type === "script") {
        str += `<script src="${path}"></script>`;
      } else if (asset.type === "link") {
        str += `<link rel="stylesheet" href="${path}" />`;
      } else {
        throw new Error("Unknown asset type: " + asset.type);
      }
    });
    return str;
  } else {
    throw new Error("Assets must be an array or string");
  }
}

/**
 * Returns a TransformStream which does a find & replace.
 */
const streamingReplace = (find, replace) => {
  let buffer = "";

  return new TransformStream({
    transform(chunk, controller) {
      buffer += chunk;
      let outChunk = "";

      while (true) {
        const index = buffer.indexOf(find);
        if (index === -1) break;
        outChunk += buffer.slice(0, index) + replace;
        buffer = buffer.slice(index + find.length);
      }

      outChunk += buffer.slice(0, -(find.length - 1));
      buffer = buffer.slice(-(find.length - 1));
      controller.enqueue(outChunk);
    },
    flush(controller) {
      if (buffer) controller.enqueue(buffer);
    },
  });
};

async function userRoutes() {
  // const settings = await userSettings();
  const settings = {
    apps: [
      {
        path: "demo",
        menu: "Demo",
        manifest: "/demo/manifest.json",
      },
      {
        path: "demo2",
        menu: "Demo2",
        manifest: "/demo2/manifest.json",
      },
    ],
  };
  return settings["apps"];
}

async function userSettings() {
  const response = await fetch("/your/settings.json").catch((err) => {
    console.error(err);
  });
  const settings = await response.json().catch((err) => {
    console.error(err);
  });
  return settings;
}

/**
 * Returns request route excluding query params and hash:
 *
 * e.g. "0.0.0.0/hello/you?name=bob#home" > "hello/you"
 */
function relativePath(url) {
  const end = url.substr(location.origin.length + 1);
  return end.split("?")[0].split("#")[0];
}

/**
 * Returns the app route e.g. "your/settings" or "your/apps/app1" if
 * the url is an app route (starts with `your/`, else undefined.
 */
function getControlledRoute(url) {
  if (url.startsWith(location.origin)) {
    const route = relativePath(url);
    if (route.startsWith("your/") && !route.endsWith(".json")) {
      return route;
    }
  }
}

/**
 * This tries the cache first, failing that it goes to network
 * and returns that, and also caches that response.
 */
const cacheThenNetwork = (event) => {
  return caches
    .match(event.request) // checks all caches
    .then((response) => {
      if (response) {
        console.log(`[SW] Served from cache: ${event.request.url}`);
        return response;
      } else {
        return caches.open(staticCacheName).then(function (cache) {
          console.log(`[SW] Requested from network: ${event.request.url}`);
          return fetch(event.request).then(function (response) {
            console.log(`[SW] Added to cache: ${event.request.url}`);
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
        });
      }
    });
};
