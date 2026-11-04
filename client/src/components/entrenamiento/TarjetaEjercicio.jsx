import { useState } from "react";
import { etiquetaZona, formatearKg, leerNumero } from "../../lib/entrenamiento.js";

const claseInput =
  "h-11 w-full rounded-lg border bg-fondo px-3 text-center text-sm font-semibold tabular-nums text-white outline-none transition placeholder:text-suave/50 focus:border-primario";

function valorInicial(ejercicio, anterior, campo) {
  const ultima = ejercicio.series.at(-1);
  if (campo === "kg") return String(ultima?.kg ?? anterior?.kg ?? "");
  return String(ultima?.reps ?? ejercicio.plan?.reps ?? anterior?.reps ?? "");
}

export default function TarjetaEjercicio({
  ejercicio,
  anterior,
  esPrimero,
  esUltimo,
  onAnadirSerie,
  onBorrarSerie,
  onQuitar,
  onMover,
}) {
  const [kg, setKg] = useState(() => valorInicial(ejercicio, anterior, "kg"));
  const [reps, setReps] = useState(() => valorInicial(ejercicio, anterior, "reps"));
  const [error, setError] = useState("");
  const [confirmarQuitar, setConfirmarQuitar] = useState(false);

  const { plan, series } = ejercicio;
  const completado = plan && series.length >= plan.series;
  const idBase = `ej-${ejercicio.id}`;

  const anadir = (e) => {
    e.preventDefault();
    const nKg = leerNumero(kg);
    const nReps = leerNumero(reps);
    if (!Number.isInteger(nReps) || nReps < 1) return setError("Las repeticiones deben ser un número entero mayor que 0.");
    if (Number.isNaN(nKg) || nKg < 0 || nKg > 1000) return setError("Introduce un peso válido (0 si es con peso corporal).");
    setError("");
    // Se mantienen los valores en los campos: lo normal es repetir peso en la siguiente serie.
    onAnadirSerie({ kg: nKg, reps: nReps });
  };

  return (
    <article
      className={`rounded-2xl border bg-superficie p-5 transition ${
        completado ? "border-acento/40" : "border-borde"
      }`}
    >
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-bold">{ejercicio.nombre}</h2>
          <p className="mt-0.5 text-xs text-suave">
            {etiquetaZona(ejercicio.zona)}
            {plan && (
              <>
                {" · "}Objetivo {plan.series} × {plan.reps} · {plan.descanso} s descanso
              </>
            )}
          </p>
          {anterior && (
            <p className="mt-1 text-xs text-suave">
              Última vez: <span className="font-semibold text-white">{formatearKg(anterior.kg)} × {anterior.reps}</span>
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {plan && (
            <span
              className={`mr-1 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${
                completado ? "bg-acento/15 text-acento" : "bg-elevada text-suave"
              }`}
            >
              {series.length}/{plan.series}
            </span>
          )}
          <button
            type="button"
            disabled={esPrimero}
            onClick={() => onMover(-1)}
            aria-label={`Subir ${ejercicio.nombre}`}
            className="grid h-9 w-9 place-items-center rounded-lg text-suave transition hover:bg-elevada hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m18 15-6-6-6 6" />
            </svg>
          </button>
          <button
            type="button"
            disabled={esUltimo}
            onClick={() => onMover(1)}
            aria-label={`Bajar ${ejercicio.nombre}`}
            className="grid h-9 w-9 place-items-center rounded-lg text-suave transition hover:bg-elevada hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Series registradas */}
      {series.length > 0 && (
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-suave">
            <tr>
              <th className="w-12 pb-2 font-medium">Serie</th>
              <th className="pb-2 font-medium">Peso</th>
              <th className="pb-2 font-medium">Reps</th>
              <th className="w-10 pb-2">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {series.map((s, i) => (
              <tr key={i} className="border-t border-borde">
                <td className="py-2 font-bold text-primario">{i + 1}</td>
                <td className="py-2 font-semibold tabular-nums">{formatearKg(s.kg)}</td>
                <td className="py-2 tabular-nums">{s.reps}</td>
                <td className="py-1 text-right">
                  <button
                    type="button"
                    onClick={() => onBorrarSerie(i)}
                    aria-label={`Borrar serie ${i + 1}`}
                    className="grid h-9 w-9 place-items-center rounded-lg text-suave transition hover:bg-red-500/10 hover:text-red-400"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Nueva serie */}
      <form onSubmit={anadir} noValidate className="mt-4 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <div>
          <label htmlFor={`${idBase}-kg`} className="block text-[10px] font-medium uppercase tracking-wider text-suave">
            Peso (kg)
          </label>
          <input
            id={`${idBase}-kg`}
            inputMode="decimal"
            placeholder="0"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            className={`${claseInput} mt-1 ${error ? "border-red-500/60" : "border-borde"}`}
          />
        </div>
        <div>
          <label htmlFor={`${idBase}-reps`} className="block text-[10px] font-medium uppercase tracking-wider text-suave">
            Reps
          </label>
          <input
            id={`${idBase}-reps`}
            inputMode="numeric"
            placeholder="0"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className={`${claseInput} mt-1 ${error ? "border-red-500/60" : "border-borde"}`}
          />
        </div>
        <button
          type="submit"
          className="h-11 rounded-lg bg-primario px-4 text-sm font-bold text-fondo transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
        >
          + Serie
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-400">
          {error}
        </p>
      )}

      {/* Quitar ejercicio */}
      <div className="mt-3 text-right">
        {confirmarQuitar ? (
          <span className="inline-flex items-center gap-3 text-xs">
            <span className="text-suave">
              {series.length ? `¿Quitar y borrar ${series.length} series?` : "¿Quitar ejercicio?"}
            </span>
            <button type="button" onClick={onQuitar} className="font-bold text-red-400 hover:underline">
              Sí, quitar
            </button>
            <button type="button" onClick={() => setConfirmarQuitar(false)} className="font-semibold text-suave hover:text-white">
              No
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmarQuitar(true)}
            className="text-xs font-semibold text-suave transition hover:text-red-400"
          >
            Quitar ejercicio
          </button>
        )}
      </div>
    </article>
  );
}