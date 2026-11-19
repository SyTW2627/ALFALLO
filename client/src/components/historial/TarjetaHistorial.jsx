import { useState } from "react";
import { eliminarEntrenamiento, esErrorDeRed } from "../../lib/api.js";
import { etiquetaObjetivo, etiquetaZona, formatearKg, salirSiSesionCaducada } from "../../lib/entrenamiento.js";
import { diaCorto, formatearHora, describirSeries } from "../../lib/historial.js";

export default function TarjetaHistorial({ entrenamiento: w, abierto, sinConexion, onAlternar, onEditar, onEliminado }) {
  const [confirmar, setConfirmar] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState("");
  const idDetalle = `detalle-${w.id}`;

  const eliminar = async () => {
    setBorrando(true);
    setError("");
    try {
      await eliminarEntrenamiento(w.id);
      onEliminado();
    } catch (err) {
      if (salirSiSesionCaducada(err)) return;
      setError(
        esErrorDeRed(err)
          ? "Sin conexión: no se puede eliminar ahora. Inténtalo cuando vuelvas a tener red."
          : err.message || "No se ha podido eliminar el entrenamiento."
      );
      setBorrando(false);
      setConfirmar(false);
    }
  };

  return (
    <li className={`rounded-2xl border bg-superficie transition ${abierto ? "border-primario/40" : "border-borde"}`}>
      {/* Resumen (pulsar para desplegar) */}
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={abierto}
        aria-controls={idDetalle}
        className="flex w-full items-center gap-4 p-4 text-left md:p-5"
      >
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-xl bg-elevada leading-none">
          <span className="text-[10px] font-semibold uppercase text-suave">{diaCorto(w.fecha)}</span>
          <span className="text-xl font-extrabold">{w.fecha.getDate()}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-bold">{w.titulo}</p>
            {w.objetivo && (
              <span className="shrink-0 rounded-full bg-primario/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primario">
                {etiquetaObjetivo(w.objetivo)}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-suave">
            {formatearHora(new Date(w.inicio))} · {w.duracionMin ?? "—"} min · {w.numSeries} series · {formatearKg(w.volumen)}
          </p>
          <p className="mt-0.5 truncate text-xs text-suave/80">{w.ejercicios.map((e) => e.nombre).join(" · ")}</p>
        </div>

        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`shrink-0 text-suave transition-transform ${abierto ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Detalle */}
      {abierto && (
        <div id={idDetalle} className="border-t border-borde p-4 md:p-5">
          <ul className="space-y-4">
            {w.ejercicios.map((e, i) => (
              <li key={`${e.id}-${i}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-semibold">{e.nombre}</p>
                  <span className="shrink-0 text-xs text-suave">
                    {etiquetaZona(e.zona)}
                    {e.zona && " · "}
                    {describirSeries(e.series)}
                  </span>
                </div>
                <ol className="mt-2 flex flex-wrap gap-1.5">
                  {e.series.map((s, j) => (
                    <li key={j} className="rounded-lg border border-borde bg-fondo px-2.5 py-1 text-xs tabular-nums">
                      <span className="mr-1 font-bold text-primario">{j + 1}</span>
                      {formatearKg(s.kg)} × {s.reps}
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>

          {w.notas && <p className="mt-4 rounded-lg border border-borde bg-fondo p-3 text-sm text-suave">{w.notas}</p>}

          {error && (
            <p role="alert" className="mt-3 text-xs text-red-400">
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onEditar}
              disabled={sinConexion}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-borde px-4 text-sm font-semibold transition hover:border-primario/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              Editar
            </button>

            {confirmar ? (
              <span className="flex flex-wrap items-center gap-3 px-1 text-xs">
                <span className="text-suave">¿Eliminar este entrenamiento? No se puede deshacer.</span>
                <button
                  type="button"
                  disabled={borrando}
                  onClick={eliminar}
                  className="font-bold text-red-400 hover:underline disabled:opacity-60"
                >
                  {borrando ? "Eliminando..." : "Sí, eliminar"}
                </button>
                <button
                  type="button"
                  disabled={borrando}
                  onClick={() => setConfirmar(false)}
                  className="font-semibold text-suave hover:text-white"
                >
                  No
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmar(true)}
                disabled={sinConexion}
                className="h-11 rounded-lg px-4 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Eliminar
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
