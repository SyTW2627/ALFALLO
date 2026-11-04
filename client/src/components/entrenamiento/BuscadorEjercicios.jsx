import { useEffect, useMemo, useRef, useState } from "react";
import { ZONAS, etiquetaZona } from "../../lib/entrenamiento.js";

// "Press Banca" encuentra "press de banca"; "biceps" encuentra "Bíceps".
const sinAcentos = (t = "") =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export default function BuscadorEjercicios({ catalogo, yaAnadidos, onElegir, onCerrar }) {
  const [texto, setTexto] = useState("");
  const [zona, setZona] = useState("");
  const entrada = useRef(null);
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;

  useEffect(() => {
    entrada.current?.focus();
    const alPulsar = (e) => e.key === "Escape" && cerrar.current();
    document.addEventListener("keydown", alPulsar);
    // Evita que la página de fondo haga scroll mientras el buscador está abierto.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alPulsar);
      document.body.style.overflow = overflow;
    };
  }, []);

  // Solo se muestran como filtro las zonas que existen en el catálogo.
  const zonas = useMemo(
    () => Object.keys(ZONAS).filter((z) => catalogo.some((e) => e.zona === z)),
    [catalogo]
  );

  const resultados = useMemo(() => {
    const q = sinAcentos(texto.trim());
    return catalogo.filter(
      (e) =>
        (!zona || e.zona === zona) &&
        (!q || sinAcentos(e.nombre).includes(q) || sinAcentos(etiquetaZona(e.zona)).includes(q))
    );
  }, [catalogo, texto, zona]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6">
      <button type="button" aria-label="Cerrar" onClick={onCerrar} className="absolute inset-0 cursor-default" tabIndex={-1} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-buscador"
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-borde bg-superficie shadow-2xl shadow-black/60 sm:rounded-2xl"
      >
        <div className="border-b border-borde p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="titulo-buscador" className="text-lg font-bold">
              Añadir ejercicio
            </h2>
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar buscador"
              className="grid h-10 w-10 place-items-center rounded-full text-suave transition hover:bg-elevada hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <label htmlFor="buscar-ejercicio" className="sr-only">
            Buscar ejercicio
          </label>
          <input
            ref={entrada}
            id="buscar-ejercicio"
            type="search"
            placeholder="Buscar por nombre o zona..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="mt-3 h-12 w-full rounded-lg border border-borde bg-fondo px-3 text-sm text-white outline-none transition placeholder:text-suave/60 focus:border-primario"
          />

          {zonas.length > 1 && (
            <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1" role="group" aria-label="Filtrar por zona">
              {["", ...zonas].map((z) => (
                <button
                  key={z || "todas"}
                  type="button"
                  aria-pressed={zona === z}
                  onClick={() => setZona(z)}
                  className={`h-8 shrink-0 rounded-full border px-3 text-xs font-semibold transition ${
                    zona === z ? "border-primario bg-primario/15 text-primario" : "border-borde text-suave hover:text-white"
                  }`}
                >
                  {z ? etiquetaZona(z) : "Todas"}
                </button>
              ))}
            </div>
          )}
        </div>

        <ul className="flex-1 overflow-y-auto p-2" aria-label="Resultados">
          {catalogo.length === 0 && (
            <li className="p-4 text-center text-sm text-suave">El catálogo de ejercicios está vacío o no se ha podido cargar.</li>
          )}
          {catalogo.length > 0 && resultados.length === 0 && (
            <li className="p-4 text-center text-sm text-suave">No hay ejercicios que coincidan.</li>
          )}
          {resultados.map((e) => {
            const anadido = yaAnadidos.has(e.id);
            return (
              <li key={e.id}>
                <button
                  type="button"
                  disabled={anadido}
                  onClick={() => onElegir(e)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-elevada disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{e.nombre}</span>
                    <span className="block text-xs text-suave">
                      {etiquetaZona(e.zona)}
                      {e.dificultad ? ` · Dificultad ${e.dificultad}/5` : ""}
                    </span>
                  </span>
                  <span className={`shrink-0 text-xs font-bold ${anadido ? "text-suave" : "text-primario"}`}>
                    {anadido ? "Añadido" : "Añadir"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}