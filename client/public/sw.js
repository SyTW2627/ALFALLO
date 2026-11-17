// Service worker de AlFallo: permite abrir la app sin conexión.
//
// VERSION y PRECACHE los rellena la integración `pwa.mjs` al compilar (npm run build) con la
// lista de todos los ficheros generados. En desarrollo (npm run dev) no se registra.
//
// Estrategias:
//   - Páginas: primero la red (para ver siempre lo último); sin red, la copia guardada.
//   - /_astro/*: primero la copia (sus nombres llevan un hash, nunca cambian).
//   - Resto de ficheros propios y Google Fonts: la copia al instante y se actualiza por detrás.
//   - La API (otro dominio) no se toca: de sus datos se encarga la propia app (lib/sinConexion.js).

const VERSION = "dev";
const PRECACHE = [];

const CACHE_APP = `alfallo-app-${VERSION}`;
const CACHE_FUENTES = "alfallo-fuentes";
const ESPERA_RED_MS = 4000; // con cobertura muy mala, mejor la copia que una pantalla en blanco

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_APP);
      // De uno en uno: si un fichero falla, el resto se guarda igual.
      await Promise.all(
        PRECACHE.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "reload" });
            if (res.ok) await cache.put(url, await sinRedireccion(res));
          } catch {
            /* se guardará la próxima vez que se pida */
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(
        nombres.filter((n) => n.startsWith("alfallo-app-") && n !== CACHE_APP).map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com") {
    event.respondWith(copiaYActualiza(req, CACHE_FUENTES));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") event.respondWith(pagina(req));
  else if (url.pathname.startsWith("/_astro/")) event.respondWith(primeroCopia(req));
  else event.respondWith(copiaYActualiza(req, CACHE_APP));
});

// "/rutinas?editar=1" y "/rutinas" se guardan como "/rutinas/".
function clavePagina(direccion) {
  let ruta = new URL(direccion).pathname;
  if (!ruta.endsWith("/") && !ruta.split("/").pop().includes(".")) ruta += "/";
  return ruta;
}

// Una respuesta que vino de una redirección no se puede usar para navegar: se copia limpia.
async function sinRedireccion(res) {
  if (!res.redirected) return res;
  return new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers });
}

function conLimite(promesa, ms) {
  return Promise.race([promesa, new Promise((_, rechazar) => setTimeout(() => rechazar(new Error("lento")), ms))]);
}

async function pagina(req) {
  const cache = await caches.open(CACHE_APP);
  const clave = clavePagina(req.url);
  try {
    const res = await conLimite(fetch(req), ESPERA_RED_MS);
    if (res.ok) await cache.put(clave, await sinRedireccion(res.clone()));
    return res;
  } catch {
    return (
      (await cache.match(clave)) ??
      (await cache.match("/offline/")) ??
      new Response("Sin conexión", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })
    );
  }
}

async function primeroCopia(req) {
  const cache = await caches.open(CACHE_APP);
  const copia = await cache.match(req);
  if (copia) return copia;
  const res = await fetch(req);
  if (res.ok) await cache.put(req, res.clone());
  return res;
}

async function copiaYActualiza(req, nombreCache) {
  const cache = await caches.open(nombreCache);
  const copia = await cache.match(req);
  const red = fetch(req)
    .then(async (res) => {
      if (res.ok || res.type === "opaque") await cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  return copia ?? (await red) ?? Response.error();
}
