import { useState } from "react";
import { etiquetaZona } from "../../lib/entrenamiento.js";
import { PERFILES, cambiarObjetivo, duracionDia, formatearDescanso, descansoCorto, plural } from "../../lib/rutinas.js";
import Contador from "./Contador.jsx";

function BotonIcono({ etiqueta, onClick, disabled, peligro = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={etiqueta}
      title={etiqueta}
      className={`grid h-9 w-9 place-items-center rounded-lg text-suave transition disabled:opacity-30 disabled:hover:bg-transparent ${
        peligro ? "hover:bg-red-500/10 hover:text-red-400" : "hover:bg-elevada hover:text-white"
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

const ICONOS = {
  subir: <path d="m18 15-6-6-6 6" />,
  bajar: <path d="m6 9 6 6 6-6" />,
  quitar: <path d="M18 6 6 18M6 6l12 12" />,
  duplicar: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </>
  ),
  papelera: <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />,
};

export default function DiaRutina({
  dia,
  numero,
  total,
  error,
  puedeDuplicar,
  onCambiar,
  onMover,
  onDuplicar,
  onQuitar,
  onAnadirEjercicio,
}) {
  const [confirmarQuitar, setConfirmarQuitar] = useState(false);
  const perfil = PERFILES[dia.objetivo];

  const cambiarEjercicio = (indice, cambios) =>
    onCambiar({ ...dia, ejercicios: dia.ejercicios.map((e, i) => (i === indice ? { ...e, ...cambios } : e)) });

  const moverEjercicio = (indice, direccion) => {
    const lista = [...dia.ejercicios];
    const destino = indice + direccion;
    if (destino < 0 || destino >= lista.length) return;
    [lista[indice], lista[destino]] = [lista[destino], lista[indice]];
    onCambiar({ ...dia, ejercicios: lista });
  };

  const quitarEjercicio = (indice) => onCambiar({ ...dia, ejercicios: dia.ejercicios.filter((_, i) => i !== indice) });

  const idNombre = `dia-${dia.clave}-nombre`;

  return (
    <article className={`rounded-2xl border bg-superficie p-5 ${error ? "border-red-500/40" : "border-borde"}`}>
      {/* Cabecera del día */}
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primario/10 text-sm font-extrabold text-primario">
          {numero}
        </span>
        <div className="min-w-0 flex-1">
          <label htmlFor={idNombre} className="sr-only">
            Nombre del día {numero}
          </label>
          <input
            id={idNombre}
            type="text"
            maxLength={40}
            placeholder="Torso, Pierna, Empuje..."
            value={dia.nombre}
            onChange={(e) => onCambiar({ ...dia, nombre: e.target.value })}
            className="h-10 w-full rounded-lg border border-transparent bg-transparent px-2 -ml-2 text-xl font-extrabold text-white outline-none transition placeholder:text-suave/50 hover:border-borde focus:border-primario focus:bg-fondo"
          />
          <p className="mt-0.5 text-xs text-suave">
            {plural(dia.ejercicios.length, "ejercicio", "ejercicios")}
            {dia.ejercicios.length > 0 && ` · ~${duracionDia(dia)} min`}
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          <BotonIcono etiqueta={`Subir día ${numero}`} onClick={() => onMover(-1)} disabled={numero === 1}>
            {ICONOS.subir}
          </BotonIcono>
          <BotonIcono etiqueta={`Bajar día ${numero}`} onClick={() => onMover(1)} disabled={numero === total}>
            {ICONOS.bajar}
          </BotonIcono>
          <BotonIcono etiqueta={`Duplicar día ${numero}`} onClick={onDuplicar} disabled={!puedeDuplicar}>
            {ICONOS.duplicar}
          </BotonIcono>
          <BotonIcono
            etiqueta={`Eliminar día ${numero}`}
            onClick={() => (dia.ejercicios.length ? setConfirmarQuitar(true) : onQuitar())}
            disabled={total === 1}
            peligro
          >
            {ICONOS.papelera}
          </BotonIcono>
        </div>
      </div>

      {confirmarQuitar && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm">
          <span className="text-red-300">¿Eliminar este día y sus {dia.ejercicios.length} ejercicios?</span>
          <span className="flex gap-3">
            <button type="button" onClick={onQuitar} className="font-bold text-red-400 hover:underline">
              Sí, eliminar
            </button>
            <button type="button" onClick={() => setConfirmarQuitar(false)} className="font-semibold text-suave hover:text-white">
              No
            </button>
          </span>
        </div>
      )}

      {/* Objetivo */}
      <fieldset className="mt-4">
        <legend className="text-xs font-medium text-suave">Objetivo</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {Object.entries(PERFILES).map(([valor, p]) => {
            const activo = dia.objetivo === valor;
            return (
              <button
                key={valor}
                type="button"
                aria-pressed={activo}
                onClick={() => !activo && onCambiar(cambiarObjetivo(dia, valor))}
                className={`rounded-xl border px-3 py-2.5 text-left transition ${
                  activo ? "border-primario bg-primario/10" : "border-borde hover:border-primario/40"
                }`}
              >
                <span className={`block text-sm font-bold ${activo ? "text-primario" : ""}`}>{p.etiqueta}</span>
                <span className="mt-0.5 block text-[11px] leading-tight text-suave">
                  {p.reps.min}–{p.reps.max} reps
                  <span className="hidden sm:inline"> · {p.sets.min}–{p.sets.max} series</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-suave">
          {perfil.lema}. Descanso de {formatearDescanso(perfil.descanso.min)} a {formatearDescanso(perfil.descanso.max)}.
        </p>
      </fieldset>

      {/* Ejercicios */}
      <ul className="mt-4 space-y-3">
        {dia.ejercicios.map((e, i) => (
          <li key={e.id} className="rounded-xl border border-borde bg-fondo/40 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">
                  <span className="mr-2 text-primario">{i + 1}</span>
                  {e.nombre}
                </p>
                <p className="text-xs text-suave">{etiquetaZona(e.zona)}</p>
              </div>
              <div className="flex shrink-0 items-center">
                <BotonIcono etiqueta={`Subir ${e.nombre}`} onClick={() => moverEjercicio(i, -1)} disabled={i === 0}>
                  {ICONOS.subir}
                </BotonIcono>
                <BotonIcono
                  etiqueta={`Bajar ${e.nombre}`}
                  onClick={() => moverEjercicio(i, 1)}
                  disabled={i === dia.ejercicios.length - 1}
                >
                  {ICONOS.bajar}
                </BotonIcono>
                <BotonIcono etiqueta={`Quitar ${e.nombre}`} onClick={() => quitarEjercicio(i)} peligro>
                  {ICONOS.quitar}
                </BotonIcono>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Contador
                etiqueta="Series"
                valor={e.sets}
                rango={perfil.sets}
                onCambiar={(v) => cambiarEjercicio(i, { sets: v })}
              />
              <Contador
                etiqueta="Reps"
                valor={e.reps}
                rango={perfil.reps}
                onCambiar={(v) => cambiarEjercicio(i, { reps: v })}
              />
              <Contador
                etiqueta="Descanso"
                valor={e.descanso}
                rango={perfil.descanso}
                paso={15}
                formato={descansoCorto}
                onCambiar={(v) => cambiarEjercicio(i, { descanso: v })}
              />
            </div>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="mt-3 text-xs text-red-400">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onAnadirEjercicio}
        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primario/50 text-sm font-bold text-primario transition hover:bg-primario/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          +
        </span>
        Añadir ejercicio
      </button>
    </article>
  );
}