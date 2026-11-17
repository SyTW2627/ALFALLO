// Integración de Astro: al terminar `npm run build`, rellena dist/sw.js con la lista de todos
// los ficheros generados (para que la app entera funcione sin conexión desde la primera visita)
// y con una versión que cambia cuando cambia cualquiera de ellos (para que se actualice sola).

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const GUARDAR = /\.(html|js|css|svg|png|webp|ico|woff2?|webmanifest)$/;

async function listar(carpeta) {
  const entradas = await readdir(carpeta, { withFileTypes: true });
  const anidados = await Promise.all(
    entradas.map((e) => (e.isDirectory() ? listar(join(carpeta, e.name)) : [join(carpeta, e.name)]))
  );
  return anidados.flat();
}

// dist/entrenamiento/index.html → /entrenamiento/   ·   dist/_astro/x.js → /_astro/x.js
function aDireccion(raiz, fichero) {
  const ruta = relative(raiz, fichero).split(sep).join("/");
  if (ruta === "index.html") return "/";
  if (ruta.endsWith("/index.html")) return `/${ruta.slice(0, -"index.html".length)}`;
  return `/${ruta}`;
}

export default function pwa() {
  return {
    name: "alfallo-pwa",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const raiz = fileURLToPath(dir);
        const rutaSw = join(raiz, "sw.js");
        const ficheros = (await listar(raiz)).filter((f) => GUARDAR.test(f) && f !== rutaSw).sort();

        const hash = createHash("sha256");
        for (const f of ficheros) {
          hash.update(aDireccion(raiz, f));
          hash.update(await readFile(f));
        }
        const version = hash.digest("hex").slice(0, 10);
        const direcciones = ficheros.map((f) => aDireccion(raiz, f));

        let sw = await readFile(rutaSw, "utf8");
        const marcas = ['const VERSION = "dev";', "const PRECACHE = [];"];
        if (!marcas.every((m) => sw.includes(m))) {
          throw new Error(`public/sw.js debe contener exactamente: ${marcas.join("  y  ")}`);
        }
        sw = sw
          .replace(marcas[0], `const VERSION = "${version}";`)
          .replace(marcas[1], `const PRECACHE = ${JSON.stringify(direcciones)};`);
        await writeFile(rutaSw, sw);

        logger.info(`Service worker: ${direcciones.length} ficheros disponibles sin conexión (versión ${version}).`);
      },
    },
  };
}
