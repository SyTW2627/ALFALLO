import { useState } from "react";
import { eliminarRutina } from "../../lib/api.js";
import { salirSiSesionCaducada } from "../../lib/entrenamiento.js";
import { PERFILES, resumenRutina, duracionDia, plural } from "../../lib/rutinas.js";

function TarjetaRutina({ rutina, onEditar, onEliminada }) {
  const [confirmar, setConfirmar] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState("");
  const r = resumenRutina(rutina);

  const eliminar = async () => {
    setBorrando(true);
    setError("");
    try {
      await eliminarRutina(rutina.id);
      onEliminada(rutina.id);
    } catch (err) {
      if (salirSiSesionCaducada(err)) return;
      setError(err.message || "No se ha podido eliminar la rutina.");
      setBorrando(false);
    }
  };

  return (
    <li className="flex flex-col rounded-2xl border border-borde bg-superficie p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-extrabold">{rutina.nombre}</h2>
          <p className="mt-1 text-xs text-suave">
            {plural(r.dias, "día", "días")} · {plural(r.ejercicios, "ejercicio", "ejercicios")} ·{" "}
            {plural(r.series, "serie", "series")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onEditar(rutina.id)}
          className="h-9 shrink-0 rounded-lg border border-borde px-3 text-xs font-semibold transition hover:border-primario/50"
        >
          Editar
        </button>
      </div>

      {/* Días de la rutina */}
      <ol className="mt-4 flex-1 divide-y divide-borde rounded-xl border border-borde bg-fondo">
        {rutina.dias.map((d, i) => (
          <li key={d.clave} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="text-sm font-bold text-primario">{i + 1}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{d.nombre}</p>
                <p className="truncate text-xs text-suave">
                  {d.ejercicios.map((e) => e.nombre).join(" · ") || "Sin ejercicios"}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-primario">
                {PERFILES[d.objetivo]?.etiqueta}
              </span>
              <span className="block text-xs text-suave">~{duracionDia(d)} min</span>
            </div>
          </li>
        ))}
      </ol>

      {error && (
        <p role="alert" className="mt-3 text-xs text-red-400">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <a
          href="/entrenamiento"
          className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-primario text-sm font-bold text-fondo transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
        >
          Entrenar
        </a>
        {confirmar ? (
          <span className="flex items-center gap-3 px-1 text-xs">
            <button type="button" disabled={borrando} onClick={eliminar} className="font-bold text-red-400 hover:underline disabled:opacity-60">
              {borrando ? "Eliminando..." : "Sí, eliminar"}
            </button>
            <button type="button" disabled={borrando} onClick={() => setConfirmar(false)} className="font-semibold text-suave hover:text-white">
              No
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmar(true)}
            className="h-11 rounded-lg px-4 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
          >
            Eliminar
          </button>
        )}
      </div>
    </li>
  );
}

export default function ListaRutinas({ rutinas, aviso, onNueva, onEditar, onEliminada }) {
  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-suave">Mi espacio / Rutinas</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Tus rutinas</h1>
          <p className="mt-1 text-sm text-suave">Planifica cada día y llega al gimnasio sabiendo qué toca.</p>
        </div>
        {rutinas.length > 0 && (
          <button
            type="button"
            onClick={onNueva}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primario px-5 text-sm font-bold text-fondo shadow-lg shadow-primario/20 transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              +
            </span>
            Nueva rutina
          </button>
        )}
      </header>

      {aviso && (
        <p role="status" className="mb-4 rounded-lg border border-acento/30 bg-acento/10 px-3 py-2 text-sm text-acento">
          {aviso}
        </p>
      )}

      {rutinas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-borde bg-superficie p-8 text-center">
          <div
            aria-hidden="true"
            className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primario/10 text-primario"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
            </svg>
          </div>
          <p className="mt-4 text-lg font-bold">Aún no tienes rutinas.</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-suave">
            Crea tu primera rutina: elige los días, el objetivo de cada uno y sus ejercicios.
          </p>
          <button
            type="button"
            onClick={onNueva}
            className="mt-5 inline-flex h-12 items-center rounded-lg bg-primario px-6 text-sm font-bold text-fondo transition hover:brightness-110"
          >
            Crear mi primera rutina
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {rutinas.map((r) => (
            <TarjetaRutina key={r.id} rutina={r} onEditar={onEditar} onEliminada={onEliminada} />
          ))}
        </ul>
      )}
    </div>
  );
}